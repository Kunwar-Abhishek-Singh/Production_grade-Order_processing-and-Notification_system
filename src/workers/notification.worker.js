
const { Worker, UnrecoverableError } = require("bullmq"); const IORedis = require("ioredis");
const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");
const { config } = require("../config/env");
const connectDB = require("../config/database");
const Order = require("../models/order.model");
const Notification = require("../models/notification.model");
const {
  notificationDLQ,
  closeNotificationDLQ
} = require("../queues/notification-dlq.queue");
const QUEUE_NAME = "order-notifications";

if (!config.redis.redisUrl) {
  throw new Error("REDIS_URL is not configured");
}

const connection = new IORedis(config.redis.redisUrl, {
  maxRetriesPerRequest: null
});

connection.on("error", (error) => {
  console.error("Worker Redis connection error:", error.message);
});

let notificationWorker;
let isShuttingDown = false;

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

  // Step 1: Ensure one notification record exists for this order.
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


  // Step 2: Atomically claim a new, failed, or stale notification.
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  const claimToken = randomUUID();

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


  // Step 3: If we couldn't claim it, check why.
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

  // Step 4: Simulate sending the notification.
  try {
    console.log("Processing order notification:", {
      orderId: order._id.toString(),
      email: order.email,
      productId: order.productId,
      quantity: order.quantity
    });

    console.log(
      `Simulated notification for order ${order._id} to ${order.email}`
    );

    notification.status = "sent";
    notification.sentAt = new Date();
    notification.processingStartedAt = null;
    await notification.save();

    return {
      orderId: order._id.toString(),
      notificationStatus: "simulated"
    };
  } catch (error) {
    notification.status = "failed";
    notification.lastError = error.message;
    notification.processingStartedAt = null;
    await notification.save();

    throw error;
  }
};



const startWorker = async () => {
  // Connect to MongoDB before processing jobs.
  await connectDB();

  notificationWorker = new Worker(
    QUEUE_NAME,

    async (job) => {
      try {
        return await processNotificationJob(job);
      } catch (error) {
        const isPermanent =
          error instanceof UnrecoverableError;

        // attemptsMade counts failures before the current attempt.
        const maxAttempts = job.opts.attempts ?? 1;
        const isLastAttempt =
          job.attemptsMade + 1 >= maxAttempts;

        if (isPermanent || isLastAttempt) {
          try {
            await notificationDLQ.add(
              "notification-dead-letter",
              {
                originalJobId: job.id,
                originalJobName: job.name,
                originalData: job.data,
                attemptsMade: job.attemptsMade + 1,
                failedReason: error.message,
                failedAt: new Date().toISOString()
              },
              {
                jobId: `dlq-${job.id}`
              }
            );

            console.error(
              `Job ${job.id} routed to DLQ after ${job.attemptsMade + 1
              } attempt(s).`
            );
          } catch (dlqError) {
            console.error(
              `CRITICAL: Could not route job ${job.id} to DLQ:`,
              dlqError.message
            );

            // Throw an ordinary error so BullMQ can retry
            // the DLQ write when attempts remain.
            throw new Error(
              `DLQ routing failed: ${dlqError.message}`,
              { cause: dlqError }
            );
          }
        }

        // Preserve the original failure so BullMQ applies
        // its normal retry/backoff or permanent-failure rules.
        throw error;
      }
    },

    {
      connection,
      concurrency: 5
    }
  );

  notificationWorker.on("completed", (job, result) => {
    console.log(`Job ${job.id} completed:`, result);
  });

  notificationWorker.on("failed", (job, error) => {
    console.error(
      `Job ${job?.id ?? "unknown"} failed:`,
      error.message
    );
  });



  notificationWorker.on("error", (error) => {
    console.error("Notification worker error:", error.message);
  });

  console.log("Notification worker is running");
};

const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received. Shutting down worker...`);

  try {
    if (notificationWorker) {
      await notificationWorker.close();
    }

    if (connection.status !== "end") {
      await connection.quit();
    }

    await closeNotificationDLQ();

    await mongoose.disconnect();

    console.log("Notification worker shut down gracefully");
    process.exitCode = 0;
  } catch (error) {
    console.error("Worker shutdown failed:", error.message);
    process.exitCode = 1;
  }
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

startWorker().catch(async (error) => {
  console.error("Failed to start notification worker:", error);

  try {
    if (connection.status !== "end") {
      await connection.quit();
    }
    await closeNotificationDLQ();
    await mongoose.disconnect();
  } catch (shutdownError) {
    console.error("Cleanup failed:", shutdownError.message);
  }

  process.exitCode = 1;
});
