import { User, IUser } from "@models";
import { PLAN_LIMITS, COMMENT_LIMITS, MESSAGE_LIMITS, PLAN_RESET_DAYS, DAY_MS } from "@config";

function resetCounterIfDue(user: IUser, counterKey: string, resetKey: string, now: number): boolean {
  const lastReset = user[resetKey] ? new Date(user[resetKey]).getTime() : 0;
  if (now - lastReset >= DAY_MS) {
    user.set(counterKey, 0);
    user.set(resetKey, new Date(now));
    return true;
  }
  return false;
}

export function hasReachedPlanLimit(user: IUser, now = Date.now()): boolean {
  resetPlanQuotaIfDue(user, now);
  const limit = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.free;
  return user.tweetCount >= limit;
}

export function resetPlanQuotaIfDue(user: IUser, now = Date.now()): boolean {
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

export function hasReachedCommentLimit(user: IUser, now = Date.now()): boolean {
  resetCounterIfDue(user, "commentCount", "commentCountResetAt", now);
  const limit = COMMENT_LIMITS[user.plan] ?? COMMENT_LIMITS.free;
  return (user.commentCount || 0) >= limit;
}

export function hasReachedMessageLimit(user: IUser, now = Date.now()): boolean {
  resetCounterIfDue(user, "messageCount", "messageCountResetAt", now);
  const limit = MESSAGE_LIMITS[user.plan] ?? MESSAGE_LIMITS.free;
  return (user.messageCount || 0) >= limit;
}

export function incrementTweetCount(user: IUser): void {
  user.tweetCount += 1;
}

export function incrementCommentCount(user: IUser): void {
  user.commentCount = (user.commentCount || 0) + 1;
}

export function incrementMessageCount(user: IUser): void {
  user.messageCount = (user.messageCount || 0) + 1;
}