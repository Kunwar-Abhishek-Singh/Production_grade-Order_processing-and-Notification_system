
const { Worker, UnrecoverableError } = require("bullmq"); const IORedis = require("ioredis");
const mongoose = require("mongoose");

const { config } = require("../config/env");
const connectDB = require("../config/database");
const Order = require("../models/order.model");
const {
  notificationDLQ
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

const startWorker = async () => {
  // Connect to MongoDB before processing jobs.
  await connectDB();

  notificationWorker = new Worker(
    QUEUE_NAME,
    async (job) => {



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

  // notificationWorker.on("failed", (job, error) => {
  //   console.error(
  //     `Job ${job?.id ?? "unknown"} failed:`,
  //     error.message
  //   );
  // });


  notificationWorker.on("failed", async (job, error) => {
    if (!job) {
      console.error("A job failed without a job reference:", error.message);
      return;
    }

    const isPermanent =
      error instanceof UnrecoverableError;

    const attemptsExhausted =
      job.attemptsMade >= job.opts.attempts;

    if (!isPermanent && !attemptsExhausted) {
      console.error(
        `Job ${job.id} failed on attempt ${job.attemptsMade}; retry may follow:`,
        error.message
      );
      return;
    }

    try {
      await notificationDLQ.add(
        "notification-dead-letter",
        {
          originalJobId: job.id,
          originalJobName: job.name,
          originalData: job.data,
          attemptsMade: job.attemptsMade,
          failedReason: error.message,
          failedAt: new Date().toISOString()
        },
        {
          jobId: `dlq-${job.id}`
        }
      );

      console.error(
        `Job ${job.id} moved to the DLQ after ${job.attemptsMade} attempt(s).`
      );
    } catch (dlqError) {
      console.error(
        `CRITICAL: Could not route job ${job.id} to the DLQ:`,
        dlqError.message
      );
    }
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
