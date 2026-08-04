export const PLAN_LIMITS = {
  free: 1,
  bronze: 3,
  silver: 5,
  gold: Infinity,
} as const;

export const COMMENT_LIMITS = {
  free: 10,
  bronze: 50,
  silver: 200,
  gold: Infinity,
} as const;

export const MESSAGE_LIMITS = {
  free: 20,
  bronze: 100,
  silver: 500,
  gold: Infinity,
} as const;

export const PLAN_RESET_DAYS = 30;
export const DAY_MS = 24 * 60 * 60 * 1000;

export type Plan = keyof typeof PLAN_LIMITS;
export type PlanLimits = typeof PLAN_LIMITS;