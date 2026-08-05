import test from "node:test";
import assert from "node:assert/strict";
import {
  PLAN_LIMITS,
  getTweetLimit,
  remainingTweetCount,
  resetQuotaIfNeeded,
  validateSubscription,
  activateOrExtendPlan,
  consumeQuotaSlot,
  releaseQuotaSlot,
} from "../utils/planLimits.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// A faithful-enough atomic simulation of MongoDB's conditional update: the
// filter and the $inc are applied together, so concurrent consumers can never
// overshoot the limit — exactly what findOneAndUpdate guarantees in Mongo.
function createAtomicMock(initialCount) {
  let count = initialCount;
  const calls = [];
  return {
    calls,
    currentCount: () => count,
    findOneAndUpdate(query, update, options) {
      calls.push({ query, update, options });
      return {
        lean: () => {
          const limit = query?.tweetCount?.$lt;
          const succeeded = count < limit;
          if (succeeded) count += update?.$inc?.tweetCount || 0;
          return Promise.resolve(
            succeeded ? { _id: query?._id, tweetCount: count } : null
          );
        },
      };
    },
    updateOne(query, update) {
      count += update?.$inc?.tweetCount || 0;
      return Promise.resolve({ modifiedCount: 1 });
    },
  };
}

test("free plan limit is 1", () => {
  assert.equal(PLAN_LIMITS.free, 1);
  assert.equal(getTweetLimit("free"), 1);
});

test("bronze plan limit is 3", () => {
  assert.equal(PLAN_LIMITS.bronze, 3);
  assert.equal(getTweetLimit("bronze"), 3);
});

test("silver plan limit is 5", () => {
  assert.equal(PLAN_LIMITS.silver, 5);
  assert.equal(getTweetLimit("silver"), 5);
});

test("gold plan is unlimited", () => {
  assert.equal(PLAN_LIMITS.gold, Infinity);
  assert.equal(getTweetLimit("gold"), Infinity);
});

test("unknown plans fall back to the free limit", () => {
  assert.equal(getTweetLimit("platinum"), 1);
  assert.equal(getTweetLimit(undefined), 1);
});

test("remaining tweet calculation", () => {
  assert.equal(remainingTweetCount({ plan: "free", tweetCount: 0 }), 1);
  assert.equal(remainingTweetCount({ plan: "bronze", tweetCount: 1 }), 2);
  assert.equal(remainingTweetCount({ plan: "silver", tweetCount: 1 }), 4);
  assert.equal(remainingTweetCount({ plan: "gold", tweetCount: 999 }), Infinity);
  assert.equal(remainingTweetCount({ plan: "silver", tweetCount: 9 }), 0);
});

test("monthly quota resets after 30 days", () => {
  const now = Date.now();
  const user = {
    plan: "bronze",
    tweetCount: 3,
    lastQuotaReset: new Date(now - 31 * DAY_MS),
  };
  assert.equal(resetQuotaIfNeeded(user, now), true);
  assert.equal(user.tweetCount, 0);
  assert.equal(user.lastQuotaReset.getTime(), now);
});

test("quota does not reset within 30 days", () => {
  const now = Date.now();
  const user = {
    plan: "bronze",
    tweetCount: 3,
    lastQuotaReset: new Date(now - 5 * DAY_MS),
  };
  assert.equal(resetQuotaIfNeeded(user, now), false);
  assert.equal(user.tweetCount, 3);
});

test("legacy accounts without lastQuotaReset fall back to planRenewedAt", () => {
  const now = Date.now();
  const user = {
    plan: "free",
    tweetCount: 1,
    planRenewedAt: new Date(now - 40 * DAY_MS),
  };
  assert.equal(resetQuotaIfNeeded(user, now), true);
  assert.equal(user.tweetCount, 0);
});

test("auto downgrade downgrades an expired plan to free", () => {
  const now = Date.now();
  const expired = {
    plan: "gold",
    tweetCount: 50,
    planActivatedAt: new Date(now - 30 * DAY_MS),
    planExpiresAt: new Date(now - 1),
  };
  assert.equal(validateSubscription(expired, now), true);
  assert.equal(expired.plan, "free");
  assert.equal(expired.tweetCount, 0);
  assert.equal(expired.planExpiresAt, null);
});

test("auto downgrade leaves an active plan untouched", () => {
  const now = Date.now();
  const active = {
    plan: "silver",
    tweetCount: 3,
    planExpiresAt: new Date(now + 10 * DAY_MS),
  };
  assert.equal(validateSubscription(active, now), false);
  assert.equal(active.plan, "silver");
});

test("auto downgrade never touches free users", () => {
  const now = Date.now();
  const free = { plan: "free", tweetCount: 1, planExpiresAt: null };
  assert.equal(validateSubscription(free, now), false);
  assert.equal(free.plan, "free");
});

test("successful payment activates a fresh 30-day term", () => {
  const now = Date.parse("2026-08-05T10:30:00.000Z");
  const user = { plan: "free", planActivatedAt: null, planExpiresAt: null };
  const { activatedAt, expiresAt } = activateOrExtendPlan(user, "bronze", now);
  assert.equal(user.plan, "bronze");
  assert.equal(user.tweetCount, 0);
  assert.equal(activatedAt.getTime(), now);
  assert.equal(expiresAt.getTime(), now + 30 * DAY_MS);
});

test("repurchasing extends expiry instead of overwriting", () => {
  const now = Date.parse("2026-08-05T10:30:00.000Z");
  const originalActivatedAt = new Date(now - 20 * DAY_MS);
  const existingExpiry = now + 10 * DAY_MS;
  const user = {
    plan: "silver",
    planActivatedAt: originalActivatedAt,
    planExpiresAt: new Date(existingExpiry),
    tweetCount: 2,
  };
  const { activatedAt, expiresAt } = activateOrExtendPlan(user, "gold", now);
  assert.equal(user.plan, "gold");
  assert.equal(activatedAt.getTime(), originalActivatedAt.getTime());
  assert.equal(expiresAt.getTime(), existingExpiry + 30 * DAY_MS);
});

test("free plan consumption is capped at one tweet", async () => {
  const mock = createAtomicMock(0);
  assert.equal(await consumeQuotaSlot("u1", getTweetLimit("free"), mock), true);
  assert.equal(await consumeQuotaSlot("u1", getTweetLimit("free"), mock), false);
  assert.equal(mock.currentCount(), 1);
});

test("bronze plan consumption is capped at three tweets", async () => {
  const mock = createAtomicMock(0);
  for (let i = 0; i < 3; i++) {
    assert.equal(await consumeQuotaSlot("u1", getTweetLimit("bronze"), mock), true);
  }
  assert.equal(await consumeQuotaSlot("u1", getTweetLimit("bronze"), mock), false);
  assert.equal(mock.currentCount(), 3);
});

test("silver plan consumption is capped at five tweets", async () => {
  const mock = createAtomicMock(0);
  for (let i = 0; i < 5; i++) {
    assert.equal(await consumeQuotaSlot("u1", getTweetLimit("silver"), mock), true);
  }
  assert.equal(await consumeQuotaSlot("u1", getTweetLimit("silver"), mock), false);
  assert.equal(mock.currentCount(), 5);
});

test("gold plan consumption is unlimited", async () => {
  const mock = createAtomicMock(0);
  for (let i = 0; i < 100; i++) {
    assert.equal(await consumeQuotaSlot("u1", getTweetLimit("gold"), mock), true);
  }
});

test("released quota slots are rolled back", async () => {
  const mock = createAtomicMock(1); // bronze, 1 tweet already used
  assert.equal(await consumeQuotaSlot("u1", 3, mock), true);
  assert.equal(mock.currentCount(), 2);
  await releaseQuotaSlot("u1", mock);
  assert.equal(mock.currentCount(), 1);
});

test("parallel posts cannot bypass the plan quota", async () => {
  const mock = createAtomicMock(0);
  const limit = getTweetLimit("bronze");
  const results = await Promise.all(
    Array.from({ length: 30 }, () => consumeQuotaSlot("u1", limit, mock))
  );
  const successes = results.filter(Boolean).length;
  assert.equal(successes, 3);
  assert.equal(mock.currentCount(), 3);
  // Every reservation ran through the conditional query that prevents the race.
  assert.ok(
    mock.calls.every(
      (c) => c.query?.tweetCount && c.query.tweetCount.$lt === limit
    )
  );
});
