// Single source of truth for plan quotas across the backend.
export const PLAN_LIMITS = {
  free: 1,
  bronze: 3,
  silver: 5,
  gold: Infinity,
};

export const PLAN_RESET_DAYS = 30;

export const COMMENT_LIMITS = {
  free: 10,
  bronze: 50,
  silver: 200,
  gold: Infinity,
};

export const MESSAGE_LIMITS = {
  free: 20,
  bronze: 100,
  silver: 500,
  gold: Infinity,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function resetCounterIfDue(user, counterKey, resetKey, now) {
  const lastReset = user[resetKey] ? new Date(user[resetKey]).getTime() : 0;
  if (now - lastReset >= DAY_MS) {
    user[counterKey] = 0;
    user[resetKey] = new Date(now);
    return true;
  }
  return false;
}

// Returns true when the user has consumed their entire plan allowance.
export function hasReachedPlanLimit(user, now = Date.now()) {
  resetPlanQuotaIfDue(user, now);
  const limit = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.free;
  return user.tweetCount >= limit;
}

// Resets the monthly tweet counter in-place when the renewal window has elapsed.
// Returns true if the counter was reset.
export function resetPlanQuotaIfDue(user, now = Date.now()) {
  if (
    now - new Date(user.planRenewedAt || now).getTime() >=
    PLAN_RESET_DAYS * 24 * 60 * 60 * 1000
  ) {
    user.tweetCount = 0;
    user.planRenewedAt = new Date(now);
    return true;
  }
  return false;
}

export function hasReachedCommentLimit(user, now = Date.now()) {
  resetCounterIfDue(user, "commentCount", "commentCountResetAt", now);
  const limit = COMMENT_LIMITS[user.plan] ?? COMMENT_LIMITS.free;
  return (user.commentCount || 0) >= limit;
}

export function hasReachedMessageLimit(user, now = Date.now()) {
  resetCounterIfDue(user, "messageCount", "messageCountResetAt", now);
  const limit = MESSAGE_LIMITS[user.plan] ?? MESSAGE_LIMITS.free;
  return (user.messageCount || 0) >= limit;
}

