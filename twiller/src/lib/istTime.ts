// IST-aware time helpers. All time-window rules (payments, audio uploads,
// mobile login) are defined in Asia/Kolkata, so the client must never use
// the device's local time for these checks.

const IST_TIME_ZONE = "Asia/Kolkata";

function istParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { hour: get("hour") % 24, minute: get("minute"), second: get("second") };
}

export function getISTHour(date: Date = new Date()): number {
  return istParts(date).hour;
}

// Payments: 10:00 AM – 11:00 AM IST (inclusive start, exclusive end).
export function isPaymentWindowOpen(date: Date = new Date()): boolean {
  const h = getISTHour(date);
  return h >= 10 && h < 11;
}

// Audio uploads: 2:00 PM – 7:00 PM IST.
export function isAudioUploadWindowOpen(date: Date = new Date()): boolean {
  const h = getISTHour(date);
  return h >= 14 && h < 19;
}

// Mobile logins: 10:00 AM – 1:00 PM IST.
export function isMobileLoginWindowOpen(date: Date = new Date()): boolean {
  const h = getISTHour(date);
  return h >= 10 && h < 13;
}

export interface Countdown {
  hours: string;
  minutes: string;
  seconds: string;
  open: boolean;
}

// Counts down to the next occurrence of `hour` (0-23) in Asia/Kolkata.
function countdownToISTHour(hour: number, date: Date): Countdown {
  // Trick: formatting with a time zone produces the IST wall-clock time
  // "as if" it were UTC. The difference between the real instant and that
  // fake instant is exactly the IST offset, which lets us compute the real
  // epoch of "10:00 AM IST" without manual offset math.
  const istNowFake = new Date(
    date.toLocaleString("en-US", { timeZone: IST_TIME_ZONE })
  );
  const offsetMs = date.getTime() - istNowFake.getTime();

  istNowFake.setHours(hour, 0, 0, 0);
  let targetFake = istNowFake.getTime();
  let targetEpoch = targetFake + offsetMs;
  if (targetEpoch <= date.getTime()) {
    targetFake += 24 * 60 * 60 * 1000;
    targetEpoch = targetFake + offsetMs;
  }

  const diffMs = Math.max(0, targetEpoch - date.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    hours: pad(Math.floor(totalSeconds / 3600)),
    minutes: pad(Math.floor((totalSeconds % 3600) / 60)),
    seconds: pad(totalSeconds % 60),
    open: false,
  };
}

// Counts down to the next 10:00 AM IST (when payments open). While the
// window is open it counts down to the 11:00 AM closing instead.
export function paymentCountdown(date: Date = new Date()): Countdown {
  const open = isPaymentWindowOpen(date);
  const cd = countdownToISTHour(open ? 11 : 10, date);
  return { ...cd, open };
}

// Audio window state: when closed, counts down to the next 2:00 PM IST
// opening; when open, counts down to the 7:00 PM IST closing.
export function audioWindowCountdown(date: Date = new Date()): Countdown {
  const open = isAudioUploadWindowOpen(date);
  const cd = countdownToISTHour(open ? 19 : 14, date);
  return { ...cd, open };
}
