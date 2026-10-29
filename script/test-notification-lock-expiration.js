
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

  const key = `test:notification-lock-expiration:${Date.now()}`;
  let lock;

  try {
    lock = await acquireNotificationLock(redis, key, 3_000);

    assert.ok(lock, "The lock should be acquired");
    console.log("PASS: Lock acquired.");

    // Simulate the lock being forcibly removed, as if its lease expired.
    // This is deterministic and avoids waiting for the renewal timer.
    await redis.del(key);

    await assert.rejects(
      lock.assertOwned(),
      /Notification lock ownership lost/
    );

    console.log("PASS: Original owner detected the lost lock.");

    // The stale owner must not delete a replacement owner's lock.
    await redis.set(key, "replacement-owner-token", "PX", 10_000);

    await lock.release();

    assert.equal(
      await redis.get(key),
      "replacement-owner-token"
    );

    console.log("PASS: Stale owner did not delete the replacement lock.");

  } finally {
    if (lock) {
      await lock.release().catch(() => {});
    }

    await redis.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then
         return redis.call("del", KEYS[1])
       end
       return 0`,
      1,
      key,
      "replacement-owner-token"
    ).catch(() => {});

    await redis.quit();
  }
};

run().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
