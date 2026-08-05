// Single source of truth for plan tweet quotas, monthly resets, auto
// downgrades, and atomic quota consumption across the backend.
import User from "../models/user.js";

export const PLAN_LIMITS = {
  free: 1,
  bronze: 3,
  silver: 5,
  gold: Infinity,
};

export const PLAN_NAMES = ["free", "bronze", "silver", "gold"];

export const PLAN_DAYS = 30; // subscription validity / quota window
const DAY_MS = 24 * 60 * 60 * 1000;
const PLAN_TERM_MS = PLAN_DAYS * DAY_MS;

export function getTweetLimit(plan) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

function lastQuotaResetTime(user, now) {
  if (user.lastQuotaReset) return new Date(user.lastQuotaReset).getTime();
  // Legacy accounts (created before lastQuotaReset existed).
  if (user.planRenewedAt) return new Date(user.planRenewedAt).getTime();
  if (user.joinedDate) return new Date(user.joinedDate).getTime();
  return now;
}

// True when the 30-day quota window has fully elapsed and a fresh quota is due.
export function isQuotaDue(user, now = Date.now()) {
  return now - lastQuotaResetTime(user, now) >= PLAN_TERM_MS;
}

// Resets the monthly counter in-place when the 30-day window has elapsed.
// Returns true if the counter was reset. Caller persists the doc.
export function resetQuotaIfNeeded(user, now = Date.now()) {
  if (isQuotaDue(user, now)) {
    user.tweetCount = 0;
    user.lastQuotaReset = new Date(now);
    user.planRenewedAt = new Date(now);
    return true;
  }
  return false;
}

// True while the user holds an unexpired paid plan.
export function hasActivePlan(user, now = Date.now()) {
  return (
    user.plan !== "free" &&
    !!user.planExpiresAt &&
    new Date(user.planExpiresAt).getTime() > now
  );
}

// Auto-downgrades an expired plan back to free in-place.
// Returns true if the user was downgraded. Caller persists the doc.
export function validateSubscription(user, now = Date.now()) {
  if (
    user.plan !== "free" &&
    user.planExpiresAt &&
    new Date(user.planExpiresAt).getTime() <= now
  ) {
    user.plan = "free";
    user.tweetCount = 0;
    user.planActivatedAt = null;
    user.planExpiresAt = null;
    return true;
  }
  return false;
}

// Number of tweets still allowed this month (Infinity for gold).
export function remainingTweetCount(user) {
  const limit = getTweetLimit(user.plan);
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - (user.tweetCount || 0));
}

// Applies a freshly purchased plan to the user. If an active paid plan
// exists the expiry is extended by 30 days from its current end instead of
// being overwritten; otherwise a fresh 30-day term starts now. The quota is
// reset so the new allowance is immediately usable. Returns the term dates.
export function activateOrExtendPlan(user, plan, now = Date.now()) {
  const nowDate = new Date(now);
  let activatedAt = user.planActivatedAt
    ? new Date(user.planActivatedAt)
    : nowDate;
  let expiresAt;

  if (
    user.plan !== "free" &&
    user.planExpiresAt &&
    new Date(user.planExpiresAt).getTime() > now
  ) {
    // Extend the existing subscription term by another 30 days.
    expiresAt = new Date(
      new Date(user.planExpiresAt).getTime() + PLAN_TERM_MS
    );
  } else {
    // No active subscription — start a brand-new 30-day term.
    activatedAt = nowDate;
    expiresAt = new Date(now + PLAN_TERM_MS);
  }

  user.plan = plan;
  user.planActivatedAt = activatedAt;
  user.planExpiresAt = expiresAt;
  user.tweetCount = 0;
  user.lastQuotaReset = nowDate;
  user.planRenewedAt = nowDate;

  return { activatedAt, expiresAt };
}

// Atomically reserves one posting slot. The check (tweetCount < limit) and the
// increment happen in a single MongoDB conditional update, so parallel requests
// can never both pass the limit check and exceed the plan quota.
// Returns true when a slot was reserved, false when the limit was reached.
// `userModel` is injectable for testing.
export async function consumeQuotaSlot(userId, limit, userModel = User) {
  const reserved = await userModel
    .findOneAndUpdate(
      { _id: userId, tweetCount: { $lt: limit } },
      { $inc: { tweetCount: 1 } },
      { new: true }
    )
    .lean();
  return !!reserved;
}

// Rolls back a previously reserved slot when tweet creation fails.
export async function releaseQuotaSlot(userId, userModel = User) {
  await userModel.updateOne({ _id: userId }, { $inc: { tweetCount: -1 } });
}
