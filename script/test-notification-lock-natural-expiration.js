
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

  const key = `test:notification-lock-natural-expiration:${Date.now()}`;
  let lock;

  try {
    lock = await acquireNotificationLock(redis, key, 3_000);

    assert.ok(lock, "The lock should be acquired");
    console.log("PASS: Lock acquired.");

    // Stop automatic renewal to simulate a worker that can no longer renew.
    const ttl = await redis.pttl(key);
    assert.ok(ttl > 0, "The lock should have a positive TTL");

    // Wait until after the original lease should have expired.
    await sleep(ttl + 500);

    assert.equal(
      await redis.get(key),
      null,
      "Redis should have naturally expired the lock"
    );

    await assert.rejects(
      lock.assertOwned(),
      /Notification lock ownership lost/
    );

    console.log("PASS: Redis naturally expired the lock.");
    console.log("PASS: The former owner detected expiration.");

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
