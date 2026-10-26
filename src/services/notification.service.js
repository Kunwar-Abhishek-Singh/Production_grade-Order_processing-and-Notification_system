
const { randomUUID } = require("node:crypto");
const { UnrecoverableError } = require("bullmq");

const Order = require("../models/order.model");
const Notification = require("../models/notification.model");

const processNotificationJob = async (job) => {
  if (job.name !== "order-created") {
    throw new UnrecoverableError(
      `Unsupported job type: ${job.name}`
    );
  }

  const { orderId } = job.data;

  const order = await Order.findById(orderId);

  if (!order) {
    throw new UnrecoverableError(
      `Order not found: ${orderId}`
    );
  }

  // Ensure one notification record exists per order and type.
  await Notification.updateOne(
    {
      orderId: order._id,
      type: "order_confirmation"
    },
    {
      $setOnInsert: {
        status: "pending",
        attempts: 0
      }
    },
    { upsert: true }
  );

  // Prepare a unique ownership token for this processing attempt.
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  const claimToken = randomUUID();

  // Atomically claim a pending, failed, or stale notification.
  const notification = await Notification.findOneAndUpdate(
    {
      orderId: order._id,
      type: "order_confirmation",
      $or: [
        { status: { $in: ["pending", "failed"] } },
        {
          status: "processing",
          processingStartedAt: { $lt: staleBefore }
        },
        {
          status: "processing",
          processingStartedAt: null
        },
        {
          status: "processing",
          processingStartedAt: { $exists: false }
        }
      ]
    },
    {
      $set: {
        status: "processing",
        processingStartedAt: new Date(),
        processingToken: claimToken,
        lastError: null
      },
      $inc: {
        attempts: 1
      }
    },
    {
      returnDocument: "after"
    }
  );

  // If the claim failed, determine whether another worker owns it.
  if (!notification) {
    const existingNotification = await Notification.findOne({
      orderId: order._id,
      type: "order_confirmation"
    });

    if (existingNotification?.status === "sent") {
      console.log(
        `Notification already sent for order ${orderId}. Skipping.`
      );

      return {
        orderId: order._id.toString(),
        notificationStatus: "already_sent"
      };
    }

    if (existingNotification?.status === "processing") {
      console.log(
        `Notification for order ${orderId} is already being processed. Skipping duplicate job.`
      );

      return {
        orderId: order._id.toString(),
        notificationStatus: "already_processing"
      };
    }

    throw new Error(
      `Could not claim notification for order ${orderId}`
    );
  }

  try {
    // Simulated delivery; a real provider will be integrated later.
    console.log("Processing order notification:", {
      orderId: order._id.toString(),
      email: order.email,
      productId: order.productId,
      quantity: order.quantity
    });

    console.log(
      `Simulated notification for order ${order._id} to ${order.email}`
    );

    // Update only if this attempt still owns the notification.
    const updateResult = await Notification.updateOne(
      {
        _id: notification._id,
        status: "processing",
        processingToken: claimToken
      },
      {
        $set: {
          status: "sent",
          sentAt: new Date(),
          processingStartedAt: null,
          processingToken: null,
          lastError: null
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      console.warn(
        `Worker lost ownership of notification for order ${orderId}. Success state was not updated.`
      );

      return {
        orderId: order._id.toString(),
        notificationStatus: "ownership_lost"
      };
    }

    return {
      orderId: order._id.toString(),
      notificationStatus: "simulated"
    };
  } catch (error) {
    // Never let an old attempt overwrite a newer owner's state.
    try {
      await Notification.updateOne(
        {
          _id: notification._id,
          status: "processing",
          processingToken: claimToken
        },
        {
          $set: {
            status: "failed",
            lastError: error.message,
            processingStartedAt: null,
            processingToken: null
          }
        }
      );
    } catch (updateError) {
      console.error(
        `Could not update notification failure state for order ${orderId}:`,
        updateError.message
      );
    }

    throw error;
  }
};

module.exports = { processNotificationJob };
