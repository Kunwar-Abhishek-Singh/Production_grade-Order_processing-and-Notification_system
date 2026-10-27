
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../src/config/database");
const Notification = require("../src/models/notification.model");

const runTest = async () => {
  let testNotificationId;

  try {
    await connectDB();

    // Create an isolated test notification.
    const notification = await Notification.create({
      orderId: new mongoose.Types.ObjectId(),
      type: "order_confirmation",
      status: "pending",
      attempts: 0
    });

    testNotificationId = notification._id;

    // Worker A claims the notification.
    const workerA = await Notification.findOneAndUpdate(
      {
        _id: testNotificationId,
        status: "pending"
      },
      {
        $set: {
          status: "processing",
          processingToken: "worker-A-token",
          processingStartedAt: new Date()
        },
        $inc: { attempts: 1 }
      },
      { returnDocument: "after" }
    );

    if (!workerA) {
      throw new Error("Worker A could not claim the notification");
    }

    console.log("Worker A claimed notification.");

    // Simulate recovery: Worker B reclaims it with a new token.
    const workerB = await Notification.findOneAndUpdate(
      {
        _id: testNotificationId,
        status: "processing",
        processingToken: "worker-A-token"
      },
      {
        $set: {
          processingToken: "worker-B-token",
          processingStartedAt: new Date()
        },
        $inc: { attempts: 1 }
      },
      { returnDocument: "after" }
    );

    if (!workerB) {
      throw new Error("Worker B could not reclaim the notification");
    }

    console.log("Worker B reclaimed notification.");

    // Worker A tries to mark it sent using its obsolete token.
    const staleUpdate = await Notification.updateOne(
      {
        _id: testNotificationId,
        status: "processing",
        processingToken: "worker-A-token"
      },
      {
        $set: {
          status: "sent",
          processingToken: null,
          processingStartedAt: null,
          sentAt: new Date()
        }
      }
    );

    console.log("Worker A stale update matched:", staleUpdate.matchedCount);

    // Verify Worker B still owns the notification.
    const finalRecord = await Notification.findById(testNotificationId);

    console.log("Final notification state:", {
      status: finalRecord.status,
      processingToken: finalRecord.processingToken,
      attempts: finalRecord.attempts
    });

    if (
      staleUpdate.matchedCount !== 0 ||
      finalRecord.status !== "processing" ||
      finalRecord.processingToken !== "worker-B-token" ||
      finalRecord.attempts !== 2
    ) {
      throw new Error("Ownership protection test FAILED");
    }

    console.log("PASS: Worker A could not overwrite Worker B's state.");
  } finally {
    if (testNotificationId) {
      await Notification.deleteOne({ _id: testNotificationId });
    }

    await mongoose.disconnect();
  }
};

runTest().catch((error) => {
  console.error("Ownership test failed:", error);
  process.exitCode = 1;
});
