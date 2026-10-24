
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const mongoose = require("mongoose");

const { config } = require("../config/env");
const connectDB = require("../config/database");
const Order = require("../models/order.model");

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

const startWorker = async () => {
  // Connect to MongoDB before processing jobs.
  await connectDB();

  notificationWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "test-retry") {
        console.log(
          `[Retry test] Attempt ${job.attemptsMade + 1} at ${new Date().toISOString()}`
        );

        throw new Error("Intentional failure for exponential backoff test");
      }

      if (job.name !== "order-created") {
        throw new Error(`Unsupported job type: ${job.name}`);
      }

      const { orderId } = job.data;

      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Simulate sending a notification for now.
      console.log("Processing order notification:", {
        orderId: order._id.toString(),
        email: order.email,
        productId: order.productId,
        quantity: order.quantity
      });

      console.log(
        `Simulated notification for order ${order._id} to ${order.email}`
      );

      return {
        orderId: order._id.toString(),
        notificationStatus: "simulated"
      };
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
    await mongoose.disconnect();
  } catch (shutdownError) {
    console.error("Cleanup failed:", shutdownError.message);
  }

  process.exitCode = 1;
});
