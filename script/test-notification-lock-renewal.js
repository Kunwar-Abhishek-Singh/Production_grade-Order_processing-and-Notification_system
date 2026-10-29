
require("dotenv").config();

const assert = require("node:assert/strict");
const IORedis = require("ioredis");
const {
  acquireNotificationLock
} = require("../src/utils/notification-lock");
const { config } = require("../src/config/env");

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  const redis = new IORedis(config.redis.redisUrl, {
    maxRetriesPerRequest: null
  });

  const key = `test:notification-lock-renewal:${Date.now()}`;
  let lock;

  try {
    // A 3-second TTL; the renewal interval should be 1 second.
    lock = await acquireNotificationLock(redis, key, 3_000);

    assert.ok(lock, "The lock should be acquired");
    console.log("PASS: Lock acquired.");

    // Wait longer than the original TTL.
    await sleep(5_000);

    assert.equal(
      await redis.get(key),
      lock.token,
      "The lock should still exist with the original token"
    );

    await lock.assertOwned();

    console.log("PASS: Lock survived beyond its original TTL.");
    console.log("PASS: Ownership verification still succeeds.");

  } finally {
    if (lock) {
      await lock.release().catch(() => {});
    }

    await redis.quit();
  }
};

run().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
