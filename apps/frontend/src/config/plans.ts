export const PLAN_LIMITS = {
  free: 1,
  bronze: 3,
  silver: 5,
  gold: null,
} as const;

export const COMMENT_LIMITS = {
  free: 10,
  bronze: 50,
  silver: 200,
  gold: null,
} as const;

export const MESSAGE_LIMITS = {
  free: 20,
  bronze: 100,
  silver: 500,
  gold: null,
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export const PLANS = [
  { id: "free", name: "Free", price: 0, limit: "1 tweet per month" },
  { id: "bronze", name: "Bronze", price: 100, limit: "3 tweets per month" },
  { id: "silver", name: "Silver", price: 300, limit: "5 tweets per month" },
  { id: "gold", name: "Gold", price: 1000, limit: "Unlimited tweets" },
] as const;