
require("dotenv").config();

const IORedis = require("ioredis");
const { config } = require("../src/config/env");
const {
  acquireNotificationLock
} = require("../src/utils/notification-lock");

const runTest = async () => {
  if (!config.redis.redisUrl) {
    throw new Error("REDIS_URL is not configured");
  }

  const redis = new IORedis(config.redis.redisUrl, {
    maxRetriesPerRequest: null
  });

  const key = `test-notification-lock:${process.pid}`;
  let lockA;
  let lockB;

  try {
    lockA = await acquireNotificationLock(redis, key, 30_000);

    if (!lockA) {
      throw new Error("First lock acquisition failed");
    }

    console.log("PASS: First caller acquired the lock.");

    lockB = await acquireNotificationLock(redis, key, 30_000);

    if (lockB !== null) {
      throw new Error("Second caller acquired an already-held lock");
    }

    console.log("PASS: Second caller could not acquire the held lock.");

    await lockA.release();
    lockA = null;

    lockB = await acquireNotificationLock(redis, key, 30_000);

    if (!lockB) {
      throw new Error("Lock could not be acquired after release");
    }

    console.log("PASS: Lock was acquired after release.");
  } finally {
    if (lockB) {
      await lockB.release();
    }

    if (lockA) {
      await lockA.release();
    }

    await redis.quit();
  }
};

runTest()
  .then(() => {
    console.log("PASS: Redis lock contention test completed.");
  })
  .catch((error) => {
    console.error("Redis lock test failed:", error);
    process.exitCode = 1;
  });
