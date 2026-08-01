import { UAParser } from "ua-parser-js";

export function getDeviceInfo(req) {
  const parser = new UAParser(req.headers["user-agent"]);
  const result = parser.getResult();

  const rawDeviceType = result.device.type; // "mobile" | "tablet" | undefined
  const device = rawDeviceType === "mobile" ? "mobile"
    : rawDeviceType === "tablet" ? "tablet"
    : "desktop"; // no reliable "laptop" signal exists in a user-agent string

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;

  return {
    browser: result.browser.name || "Unknown",
    browserVersion: result.browser.version || "",
    os: result.os.name || "Unknown",
    device,
    ip,
  };
}

export function isMicrosoftBrowser(browserName) {
  return ["Edge", "IE", "Edge Legacy"].includes(browserName);
}

export function isChrome(browserName) {
  // ua-parser-js reports Chrome on Android as "Mobile Chrome".
  return browserName === "Chrome" || browserName === "Mobile Chrome";
}
