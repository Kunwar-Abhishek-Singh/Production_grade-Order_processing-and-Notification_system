
const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const { config } = require("../config/env");

if (!config.redis.redisUrl) {
  throw new Error("REDIS_URL is not configured");
}

const connection = new IORedis(config.redis.redisUrl, {
  maxRetriesPerRequest: null
});

connection.on("error", (error) => {
  console.error("BullMQ Redis connection error:", error.message);
});

const notificationQueue = new Queue("order-notifications", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 1000
    },
    removeOnComplete: 1000,
    removeOnFail: false
  }
});

const closeNotificationQueue = async () => {
  await notificationQueue.close();
  await connection.quit();
};

module.exports = {
  notificationQueue,
  closeNotificationQueue
};
