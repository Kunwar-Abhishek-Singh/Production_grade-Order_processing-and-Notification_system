const { createClient } = require("redis");
const config = require("./env");

const redisClient = createClient({
  url: config.config.redis.redisUrl
});

redisClient.on("error", (error) => {
  console.error("Redis client error:", error.message);
});

const connectRedis = async () => {
  if (!config.config.redis.redisUrl) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  console.log("Redis connected successfully");
};

const disconnectRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
};

module.exports = {
  redisClient,
  connectRedis,
  disconnectRedis
};