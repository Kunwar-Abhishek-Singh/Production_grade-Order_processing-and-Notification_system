
require("dotenv").config();

const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const connectDB = require("../src/config/database");
const Order = require("../src/models/order.model");
const Notification = require("../src/models/notification.model");

const {
  processNotificationJob,
  closeNotificationLockConnection
} = require("../src/services/notification.service");

const runTest = async () => {
  let orderId;

  try {
    await connectDB();

    // Create an isolated test order.
    const order = await Order.create({
      productId: `concurrency-test-${Date.now()}`,
      quantity: 1,
      email: "concurrency-test@example.com"
    });

    orderId = order._id;

    const job = {
      id: `concurrency-test-${orderId}`,
      name: "order-created",
      data: {
        orderId: orderId.toString()
      }
    };

    console.log("Created isolated test order:", orderId.toString());

    // Start both attempts together.
    const results = await Promise.allSettled([
      processNotificationJob(job),
      processNotificationJob(job)
    ]);

    console.log(
      "Concurrent processing outcomes:",
      results.map((result) =>
        result.status === "fulfilled"
          ? result.value.notificationStatus
          : result.reason.message
      )
    );

    // One attempt must complete the simulated delivery.
    const successfulAttempts = results.filter(
      (result) =>
        result.status === "fulfilled" &&
        result.value.notificationStatus === "simulated"
    );

    assert.equal(
      successfulAttempts.length,
      1,
      "Exactly one attempt should perform simulated delivery"
    );

    // Verify the persisted notification state.
    const notification = await Notification.findOne({
      orderId,
      type: "order_confirmation"
    });

    assert.ok(notification, "Notification record should exist");
    assert.equal(notification.status, "sent");
    assert.equal(notification.attempts, 1);
    assert.equal(notification.processingToken, null);
    assert.equal(notification.processingStartedAt, null);
    assert.equal(notification.lastError, null);
    assert.ok(notification.sentAt);

    console.log("PASS: Exactly one simulated delivery completed.");
    console.log("PASS: MongoDB contains one successful processing attempt.");
    console.log("PASS: Notification state is consistent.");

  } finally {
    if (orderId) {
      await Notification.deleteMany({ orderId });
      await Order.deleteOne({ _id: orderId });
    }

    await closeNotificationLockConnection().catch(() => {});
    await mongoose.disconnect();
  }
};

runTest().catch((error) => {
  console.error("Notification concurrency test failed:", error);
  process.exitCode = 1;
});
