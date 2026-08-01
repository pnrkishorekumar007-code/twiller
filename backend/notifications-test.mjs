import "./loadEnv.js";
import mongoose from "mongoose";
import getFirebaseAdmin from "./utils/firebaseAdmin.js";
import { getAuth } from "firebase-admin/auth";
import User from "./models/user.js";

const BASE = "http://localhost:5000";
const WEB_API_KEY = "AIzaSyA-uxl5aNJXEVly3Jvu-RClGRKe3XlRXp0";
const PASS = "TestPass123";
const EMAIL = "notif-test@twiller.test";

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

async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

await User.deleteMany({ email: EMAIL });
try { const u = await auth.getUserByEmail(EMAIL); await auth.deleteUser(u.uid); } catch {}

const fb = await auth.createUser({ email: EMAIL, password: PASS, displayName: "Notif Test" });
await User.create({
  email: EMAIL,
  username: "notiftest",
  displayName: "Notif Test",
  avatar: "https://i.imgur.com/n.png",
  firebaseUid: fb.uid,
});

const user = await User.findOne({ email: EMAIL }).lean();
check("default notificationsEnabled = false", user.notificationsEnabled === false, `value=${user.notificationsEnabled}`);
check("field exists", "notificationsEnabled" in user);

const token = await firebaseSignIn(EMAIL, PASS);

// someone else cannot set this user's preference (auth check)
const otherEmail = "notif-other@twiller.test";
await User.deleteMany({ email: otherEmail });
let otherFb = null;
try { otherFb = await auth.createUser({ email: otherEmail, password: PASS, displayName: "Other" }); } catch {}
await User.create({ email: otherEmail, username: "notifother", displayName: "Other", avatar: "https://i.imgur.com/o.png", firebaseUid: otherFb.uid });
const otherToken = await firebaseSignIn(otherEmail, PASS);

let r = await api("PATCH", "/userdata/" + EMAIL, { token: otherToken, body: { notificationsEnabled: true } });
check("other user cannot edit this profile", r.status === 403, `status=${r.status}`);

// turn it on
r = await api("PATCH", "/userdata/" + EMAIL, { token, body: { notificationsEnabled: true } });
check("PATCH on -> 200", r.status === 200, `status=${r.status}`);
let dbUser = await User.findOne({ email: EMAIL }).lean();
check("notificationsEnabled persisted = true", dbUser.notificationsEnabled === true, `value=${dbUser.notificationsEnabled}`);

// turn it off
r = await api("PATCH", "/userdata/" + EMAIL, { token, body: { notificationsEnabled: false } });
dbUser = await User.findOne({ email: EMAIL }).lean();
check("PATCH off -> persisted false", r.status === 200 && dbUser.notificationsEnabled === false, `value=${dbUser.notificationsEnabled}`);

// partial update (only displayName) must not clobber the flag
await User.updateOne({ email: EMAIL }, { $set: { notificationsEnabled: true } });
r = await api("PATCH", "/userdata/" + EMAIL, { token, body: { displayName: "Notif Renamed" } });
dbUser = await User.findOne({ email: EMAIL }).lean();
check("partial update preserves notificationsEnabled", r.status === 200 && dbUser.notificationsEnabled === true, `name=${dbUser.displayName} notif=${dbUser.notificationsEnabled}`);

await User.deleteMany({ email: EMAIL });
await User.deleteMany({ email: otherEmail });
try { const u = await auth.getUserByEmail(EMAIL); await auth.deleteUser(u.uid); } catch {}
try { const u = await auth.getUserByEmail(otherEmail); await auth.deleteUser(u.uid); } catch {}
await mongoose.disconnect();

const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
