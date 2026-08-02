export const PLAN_LIMITS: Record<string, number | null> = {
  free: 1,
  bronze: 3,
  silver: 5,
  gold: null,
};

export const PLANS = [
  { id: "free", name: "Free", price: 0, limit: "1 tweet per month" },
  { id: "bronze", name: "Bronze", price: 100, limit: "3 tweets per month" },
  { id: "silver", name: "Silver", price: 300, limit: "5 tweets per month" },
  {
    id: "gold",
    name: "Gold",
    price: 1000,
    limit: "Unlimited tweets",
  },
];
