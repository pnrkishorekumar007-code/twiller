// Reusable IST-aware payment window check shared by backend and used to
// mirror the exact same boundary on the frontend (src/lib/istTime.ts).
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const PAYMENT_TZ = "Asia/Kolkata";
const WINDOW_START_HOUR = 10; // 10:00 AM IST (inclusive)
const WINDOW_END_HOUR = 11; // 11:00 AM IST (exclusive)

export function isPaymentWindowOpen(now = new Date()) {
  const hour = dayjs(now).tz(PAYMENT_TZ).hour();
  return hour >= WINDOW_START_HOUR && hour < WINDOW_END_HOUR;
}
