import "./loadEnv.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import getFirebaseAdmin from "./utils/firebaseAdmin.js";
import { getAuth } from "firebase-admin/auth";
import User from "./models/user.js";
import LoginHistory from "./models/loginHistory.js";
import LoginOtp from "./models/loginOtp.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const BASE = "http://localhost:5000";
const WEB_API_KEY = "AIzaSyA-uxl5aNJXEVly3Jvu-RClGRKe3XlRXp0";
const PASS = "TestPass123";
const EMAIL = "loginsec-test@twiller.test";

const UA_CHROME_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const UA_EDGE_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0";
const UA_CHROME_MOBILE =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

const results = [];
function check(name, cond, extra = "") {
  results.push({ name, ok: !!cond, extra });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  | " + extra : ""}`);
}

async function firebaseSignIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) throw new Error(`signIn failed for ${email}: ${res.status}`);
  const data = await res.json();
  return data.idToken;
}

async function api(method, path, { token, body, ua } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(ua ? { "User-Agent": ua } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

const app = getFirebaseAdmin();
const auth = getAuth(app);
await mongoose.connect(process.env.MONGODB_URL);

// --- cleanup leftovers ---
await LoginHistory.deleteMany({ user: { $in: (await User.find({ email: EMAIL }).lean()).map((u) => u._id) } });
await LoginOtp.deleteMany({ user: { $in: (await User.find({ email: EMAIL }).lean()).map((u) => u._id) } });
await User.deleteMany({ email: EMAIL });
try { const u = await auth.getUserByEmail(EMAIL); await auth.deleteUser(u.uid); } catch {}

// --- setup ---
const fb = await auth.createUser({ email: EMAIL, password: PASS, displayName: "LoginSec Test" });
await User.create({
  email: EMAIL,
  username: "loginsec",
  displayName: "LoginSec Test",
  avatar: "https://i.imgur.com/l.png",
  firebaseUid: fb.uid,
});

const user = await User.findOne({ email: EMAIL }).lean();
const token = await firebaseSignIn(EMAIL, PASS);

const istHour = dayjs().tz("Asia/Kolkata").hour();
const mobileAllowed = istHour >= 10 && istHour < 13;
console.log(`\nIST hour now: ${istHour} -> mobile window ${mobileAllowed ? "OPEN" : "CLOSED"}\n`);

// 1. Chrome desktop login -> OTP required, no history entry yet
let r = await api("POST", "/auth/login-session", { token, ua: UA_CHROME_DESKTOP });
check("chrome desktop -> otpRequired:true", r.status === 200 && r.data?.otpRequired === true, `status=${r.status}`);
let historyCount = await LoginHistory.countDocuments({ user: user._id });
check("chrome login creates NO history entry yet", historyCount === 0, `count=${historyCount}`);
let otpDoc = await LoginOtp.findOne({ user: user._id });
check("login OTP doc created", !!otpDoc, otpDoc ? `expiresIn=${Math.round((otpDoc.expiresAt - Date.now()) / 1000)}s` : "");

// 2. Wrong OTP -> 400, attempts incremented
r = await api("POST", "/auth/verify-login-otp", { token, body: { otp: "999999" } });
check("wrong otp -> 400 Incorrect OTP", r.status === 400 && r.data?.error === "Incorrect OTP", `status=${r.status} err=${r.data?.error}`);
otpDoc = await LoginOtp.findOne({ user: user._id });
check("wrong otp increments attempts", otpDoc?.attempts === 1, `attempts=${otpDoc?.attempts}`);

// 3. Invalid OTP format
r = await api("POST", "/auth/verify-login-otp", { token, body: { otp: "12ab" } });
check("non-6-digit otp -> 400", r.status === 400, `status=${r.status}`);

// 4. Correct OTP (replace hash since we can't read the emailed plaintext)
await LoginOtp.updateOne({ user: user._id }, { otpHash: await bcrypt.hash("123456", 10) });
r = await api("POST", "/auth/verify-login-otp", { token, body: { otp: "123456" }, ua: UA_CHROME_DESKTOP });
check("correct otp -> success:true", r.status === 200 && r.data?.success === true, `status=${r.status}`);
otpDoc = await LoginOtp.findOne({ user: user._id });
check("otp doc deleted after verify", !otpDoc);
let history = await LoginHistory.find({ user: user._id }).lean();
check("history entry created w/ otpVerified:true", history.length === 1 && history[0].otpVerified === true, `count=${history.length} verified=${history[0]?.otpVerified}`);
check("history entry has device data", history[0]?.device === "desktop" && history[0]?.browser === "Chrome", `${history[0]?.browser} / ${history[0]?.device}`);

// 5. Edge desktop -> no OTP, direct success, immediate history entry
r = await api("POST", "/auth/login-session", { token, ua: UA_EDGE_DESKTOP });
check("edge desktop -> success:true, no otp", r.status === 200 && r.data?.success === true && !r.data?.otpRequired, `status=${r.status}`);
history = await LoginHistory.find({ user: user._id }).sort({ timestamp: -1 }).lean();
check("edge login logged directly", history.length === 2 && history[0].otpVerified === false, `count=${history.length} verified=${history[0]?.otpVerified}`);
check("edge detected as browser=Edge", history[0]?.browser === "Edge", history[0]?.browser);

// 6. Mobile + Chrome -> either blocked (outside window) or otpRequired (inside)
r = await api("POST", "/auth/login-session", { token, ua: UA_CHROME_MOBILE });
if (mobileAllowed) {
  check("mobile chrome (window open) -> otpRequired", r.status === 200 && r.data?.otpRequired === true, `status=${r.status}`);
  await LoginOtp.deleteMany({ user: user._id });
} else {
  check("mobile chrome (window closed) -> 403 blocked", r.status === 403 && r.data?.blocked === true && r.data?.reason === "mobile_time_window", `status=${r.status} ${JSON.stringify(r.data)}`);
  history = await LoginHistory.find({ user: user._id }).lean();
  check("blocked attempt NOT logged", history.length === 2, `count=${history.length}`);
}

// 7. GET login-history (limit 20, newest first)
r = await api("GET", "/auth/login-history", { token });
check("GET login-history -> 200 array", r.status === 200 && Array.isArray(r.data), `status=${r.status} len=${r.data?.length}`);
check("login-history newest first", r.data?.length >= 1 && r.data[0].timestamp >= r.data[r.data.length - 1].timestamp);

// 8. Unauthenticated -> 401
r = await api("POST", "/auth/login-session", {});
check("no token -> 401", r.status === 401, `status=${r.status}`);

// --- cleanup ---
await LoginHistory.deleteMany({ user: user._id });
await LoginOtp.deleteMany({ user: user._id });
await User.deleteMany({ email: EMAIL });
try { await auth.deleteUser(fb.uid); } catch {}

const passed = results.filter((x) => x.ok).length;
console.log(`\n${passed}/${results.length} passed`);
await mongoose.disconnect();
process.exit(passed === results.length ? 0 : 1);
