
require("dotenv").config();

const assert = require("node:assert/strict");
const IORedis = require("ioredis");
const { config } = require("../src/config/env");

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  const redis = new IORedis(config.redis.redisUrl, {
    maxRetriesPerRequest: null
  });

  const key = `test:redis-natural-expiration:${Date.now()}`;

  try {
    const result = await redis.set(
      key,
      "temporary-lock-token",
      "PX",
      2_000,
      "NX"
    );

    assert.equal(result, "OK");
    console.log("PASS: Redis key created with a 2-second TTL.");

    const initialTtl = await redis.pttl(key);

    assert.ok(initialTtl > 0 && initialTtl <= 2_000);
    console.log("PASS: Redis reports a valid expiration time.");

    await sleep(2_500);

    const value = await redis.get(key);

    assert.equal(value, null);
    console.log("PASS: Redis naturally expired the key.");

    assert.equal(await redis.pttl(key), -2);
    console.log("PASS: Redis confirms the key no longer exists.");

  } finally {
    await redis.del(key).catch(() => {});
    await redis.quit();
  }
};

run().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
