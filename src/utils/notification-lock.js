
const { randomUUID } = require("node:crypto");

const DEFAULT_TTL_MS = 30_000;
const RENEW_INTERVAL_MS = 10_000;

const RENEW_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("pexpire", KEYS[1], ARGV[2])
  end

  return 0
`;

const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  end

  return 0
`;

const acquireNotificationLock = async (
  redis,
  key,
  ttlMs = DEFAULT_TTL_MS
) => {
  const token = randomUUID();

  // Atomically acquire the lock only if nobody owns it.
  const acquired = await redis.set(
    key,
    token,
    "PX",
    ttlMs,
    "NX"
  );

  if (acquired !== "OK") {
    return null;
  }

  let lost = false;
  let released = false;
  let renewing = false;

  const renewalTimer = setInterval(async () => {
    if (released || lost || renewing) {
      return;
    }

    renewing = true;

    try {
      const result = await redis.eval(
        RENEW_SCRIPT,
        1,
        key,
        token,
        ttlMs
      );

      if (result !== 1) {
        lost = true;
        console.error(`Notification lock lost: ${key}`);
      }
    } catch (error) {
      // Fail closed: do not continue as if ownership were guaranteed.
      lost = true;

      console.error(
        `Notification lock renewal failed for ${key}:`,
        error.message
      );
    } finally {
      renewing = false;
    }
  }, Math.min(RENEW_INTERVAL_MS, Math.floor(ttlMs / 3)));

  renewalTimer.unref();

  return {
    key,
    token,

    isLost() {
      return lost;
    },

    assertOwned() {
      if (released || lost) {
        throw new Error(
          `Notification lock ownership lost: ${key}`
        );
      }
    },

    async release() {
      if (released) {
        return;
      }

      released = true;
      clearInterval(renewalTimer);

      // Delete only if this process still owns the lock.
      const result = await redis.eval(
        RELEASE_SCRIPT,
        1,
        key,
        token
      );

      if (result !== 1) {
        lost = true;
      }
    }
  };
};

module.exports = { acquireNotificationLock };




/*
Atomic acquisition: Redis grants the lock only if the key doesn't already exist.



Unique ownership: Each lock receives a random token.



Automatic renewal: The 30-second lease is renewed every 10 seconds while ownership is maintained.



Safe release: A worker can delete the lock only if its token still matches.



Conservative failure handling: If renewal fails, the lock is considered lost.

*/
