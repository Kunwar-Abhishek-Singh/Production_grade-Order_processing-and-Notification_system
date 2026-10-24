
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
  console.error("Notification DLQ Redis error:", error.message);
});

const notificationDLQ = new Queue("order-notifications-dlq", {
  connection,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false
  }
});

const closeNotificationDLQ = async () => {
  await notificationDLQ.close();

  if (connection.status !== "end") {
    await connection.quit();
  }
};

module.exports = {
  notificationDLQ,
  closeNotificationDLQ
};
