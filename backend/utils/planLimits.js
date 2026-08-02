// Single source of truth for plan tweet quotas across the backend.
export const PLAN_LIMITS = {
  free: 1,
  bronze: 3,
  silver: 5,
  gold: Infinity,
};

export const PLAN_RESET_DAYS = 30;

// Returns true when the user has consumed their entire plan allowance.
export function hasReachedPlanLimit(user, now = Date.now()) {
  if (
    now - new Date(user.planRenewedAt || now).getTime() >=
    PLAN_RESET_DAYS * 24 * 60 * 60 * 1000
  ) {
    return false;
  }
  const limit = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.free;
  return user.tweetCount >= limit;
}

// Resets the monthly counter in-place when the renewal window has elapsed.
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
