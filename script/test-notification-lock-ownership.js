
require("dotenv").config();

const assert = require("node:assert/strict");
const IORedis = require("ioredis");
const { acquireNotificationLock } = require("../src/utils/notification-lock");
const { config } = require("../src/config/env");

const run = async () => {
  const redis = new IORedis(config.redis.redisUrl, {
    maxRetriesPerRequest: null
  });

  const key = `test:notification-lock-ownership:${Date.now()}`;
  let lock;

  try {
    lock = await acquireNotificationLock(redis, key, 30_000);

    assert.ok(lock, "Worker A should acquire the lock");
    console.log("PASS: Worker A acquired the lock.");

    // Simulate another owner replacing Worker A's token.
    await redis.set(key, "worker-B-token", "PX", 30_000);

    await assert.rejects(
      lock.assertOwned(),
      /Notification lock ownership lost/
    );

    console.log("PASS: Worker A detected that it lost ownership.");

    assert.equal(await redis.get(key), "worker-B-token");
    console.log("PASS: Worker A did not delete Worker B's lock.");

  } finally {
    if (lock) {
      await lock.release().catch(() => {});
    }

    // Clean up only if the key still contains our test token.
    await redis.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then
         return redis.call("del", KEYS[1])
       end
       return 0`,
      1,
      key,
      "worker-B-token"
    ).catch(() => {});

    await redis.quit();
  }
};

run().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
