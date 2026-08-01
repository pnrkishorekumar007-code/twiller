import "dotenv/config";
import mongoose from "mongoose";
import getFirebaseAdmin from "./utils/firebaseAdmin.js";
import { getAuth } from "firebase-admin/auth";
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import Comment from "./models/comment.js";
import Notification from "./models/notification.js";
import Conversation from "./models/conversation.js";

const BASE = "http://localhost:5000";
const WEB_API_KEY = "AIzaSyA-uxl5aNJXEVly3Jvu-RClGRKe3XlRXp0";
const PASS = "TestPass123";

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

async function api(method, path, { token, body, params } = {}) {
  const url = new URL(BASE + path);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
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

const emails = ["authtest-a@twiller.test", "authtest-b@twiller.test", "authtest-c@twiller.test"];
const uids = {};

// --- cleanup any leftovers from a previous run ---
try {
  await Conversation.deleteMany({ participants: { $in: await Promise.all(
    (await User.find({ email: { $in: emails } }).lean()).map((u) => u._id)
  ) } });
} catch {}
await User.deleteMany({ email: { $in: emails } });
for (const e of emails) {
  try { const u = await auth.getUserByEmail(e); await auth.deleteUser(u.uid); } catch {}
}

// --- setup ---
for (const e of emails) {
  const fb = await auth.createUser({ email: e, password: PASS, displayName: "AuthTest" });
  uids[e] = fb.uid;
}
// A and C have firebaseUid set; B does NOT (tests email-fallback backfill)
await User.create({ email: emails[0], username: "authtesta", displayName: "Auth Test A", avatar: "https://i.imgur.com/a.png", firebaseUid: uids[emails[0]] });
await User.create({ email: emails[1], username: "authtestb", displayName: "Auth Test B", avatar: "https://i.imgur.com/b.png" });
await User.create({ email: emails[2], username: "authtestc", displayName: "Auth Test C", avatar: "https://i.imgur.com/c.png", firebaseUid: uids[emails[2]] });

const userA = await User.findOne({ email: emails[0] }).lean();
const userB = await User.findOne({ email: emails[1] }).lean();
const userC = await User.findOne({ email: emails[2] }).lean();

const tokenA = await firebaseSignIn(emails[0], PASS);
const tokenB = await firebaseSignIn(emails[1], PASS);
const tokenC = await firebaseSignIn(emails[2], PASS);

console.log("\n=== 1. 401s: no token / bad token ===\n");
let r = await api("POST", "/post", { body: { content: "should not post" } });
check("POST /post no token -> 401", r.status === 401, `status=${r.status} body=${JSON.stringify(r.data)}`);
r = await api("GET", "/bookmarks", {});
check("GET /bookmarks no token -> 401", r.status === 401, `status=${r.status}`);
r = await api("GET", "/notifications", {});
check("GET /notifications no token -> 401", r.status === 401, `status=${r.status}`);
r = await api("GET", "/conversations", {});
check("GET /conversations no token -> 401", r.status === 401, `status=${r.status}`);
r = await api("POST", "/like/" + userA._id, { body: {} });
check("POST /like no token -> 401", r.status === 401, `status=${r.status}`);
r = await api("POST", "/register", { body: {} });
check("POST /register no token -> 401", r.status === 401, `status=${r.status}`);
r = await api("GET", "/loggedinuser", { token: "garbage.token.here" });
check("GET /loggedinuser bad token -> 401", r.status === 401, `status=${r.status}`);
r = await api("POST", "/post", { token: "garbage.token.here", body: { content: "x" } });
check("POST /post bad token -> 401", r.status === 401, `status=${r.status}`);

console.log("\n=== 2. Public routes still open (no token) ===\n");
r = await api("GET", "/trends", {});
check("GET /trends open", r.status === 200, `status=${r.status}`);
r = await api("GET", "/users", {});
check("GET /users open", r.status === 200, `status=${r.status}`);
r = await api("GET", "/user/" + userA._id, {});
check("GET /user/:id open", r.status === 200, `status=${r.status}`);
r = await api("GET", "/post", {});
check("GET /post open", r.status === 200, `status=${r.status}`);

console.log("\n=== 3. Impersonation blocked: identity always from token ===\n");
// A posts a tweet but tries to claim it as B
r = await api("POST", "/post", { token: tokenA, body: { content: "auth-test tweet", author: String(userB._id) } });
const tweet = r.data;
check("A posts with author=B in body -> 201 (allowed, identity from token)", r.status === 201, `status=${r.status}`);
const savedTweet = await Tweet.findById(tweet?._id).lean();
check("tweet.author === A, NOT B", savedTweet && String(savedTweet.author) === String(userA._id), `author=${savedTweet?.author} A=${userA._id} B=${userB._id}`);

// B likes the tweet while passing A's id in the body
r = await api("POST", "/like/" + tweet._id, { token: tokenB, body: { userId: String(userA._id) } });
const liked = await Tweet.findById(tweet._id).lean();
check("like used B (token), not A (body)", liked.likedBy.some((id) => String(id) === String(userB._id)) && !liked.likedBy.some((id) => String(id) === String(userA._id)), `likedBy=${JSON.stringify(liked.likedBy)}`);

// B retweets while passing A's id
r = await api("POST", "/retweet/" + tweet._id, { token: tokenB, body: { userId: String(userA._id) } });
const rt = await Tweet.findById(tweet._id).lean();
check("retweet used B (token), not A (body)", rt.retweetedBy.some((id) => String(id) === String(userB._id)) && !rt.retweetedBy.some((id) => String(id) === String(userA._id)), `retweetedBy=${JSON.stringify(rt.retweetedBy)}`);

// B follows A while passing C's id as the follower
r = await api("POST", "/follow/" + userA._id, { token: tokenB, body: { userId: String(userC._id) } });
const targetAfter = await User.findById(userA._id).lean();
check("follow used B (token), not C (body)", targetAfter.followedBy.some((id) => String(id) === String(userB._id)) && !targetAfter.followedBy.some((id) => String(id) === String(userC._id)), `followedBy=${JSON.stringify(targetAfter.followedBy)}`);

// A bookmarks while passing B's id
r = await api("POST", "/bookmark/" + tweet._id, { token: tokenA, body: { userId: String(userB._id) } });
const bookA = await User.findById(userA._id).lean();
const bookB = await User.findById(userB._id).lean();
check("bookmark used A (token), not B (body)", bookA.bookmarks.some((id) => String(id) === String(tweet._id)) && !bookB.bookmarks.some((id) => String(id) === String(tweet._id)), `A=${JSON.stringify(bookA.bookmarks)} B=${JSON.stringify(bookB.bookmarks)}`);

// GET /bookmarks returns A's bookmarks without a userId param
r = await api("GET", "/bookmarks", { token: tokenA });
check("GET /bookmarks (A token, no userId param) -> 200 with tweet", r.status === 200 && Array.isArray(r.data) && r.data.length === 1, `status=${r.status} len=${Array.isArray(r.data) ? r.data.length : "?"}`);

// comments: B comments passing A's id as author
r = await api("POST", "/comments/" + tweet._id, { token: tokenB, body: { author: String(userA._id), content: "auth-test comment" } });
const savedComment = await Comment.findById(r.data?._id).lean();
check("comment author = B (token), not A (body)", savedComment && String(savedComment.author) === String(userB._id), `author=${savedComment?.author}`);

// profile edit: A tries to edit B's profile via URL, and tries to set plan=gold
r = await api("PATCH", "/userdata/" + emails[1], { token: tokenA, body: { displayName: "HACKED", plan: "gold", tweetCount: 999 } });
check("A cannot edit B's profile (403)", r.status === 403, `status=${r.status} body=${JSON.stringify(r.data)}`);
r = await api("PATCH", "/userdata/" + emails[0], { token: tokenA, body: { displayName: "Auth Test A2", plan: "gold", tweetCount: 999 } });
const aAfter = await User.findById(userA._id).lean();
check("A edits own profile -> 200 + displayName applied", r.status === 200 && aAfter.displayName === "Auth Test A2", `status=${r.status}`);
check("plan tamper blocked (still free)", aAfter.plan === "free" && aAfter.tweetCount === 0, `plan=${aAfter.plan} tweetCount=${aAfter.tweetCount}`);

console.log("\n=== 4. DMs: token identity + participant enforcement ===\n");
// A starts a conversation with B
r = await api("POST", "/conversation", { token: tokenA, body: { userId: String(userB._id), otherId: String(userB._id) } });
check("POST /conversation A<->B with token", r.status === 200, `status=${r.status}`);
const convAB = await Conversation.findOne({ participants: { $all: [userA._id, userB._id] } }).lean();
check("conversation created with A+B", !!convAB, "");

// A sends a message claiming sender=B
r = await api("POST", "/message", { token: tokenA, body: { userId: String(userB._id), otherId: String(userB._id), content: "auth-test dm from A" } });
const convAfter = await Conversation.findOne({ participants: { $all: [userA._id, userB._id] } }).lean();
const lastMsg = convAfter.messages[convAfter.messages.length - 1];
check("message sender = A (token), not B (body)", String(lastMsg.sender) === String(userA._id), `sender=${lastMsg.sender}`);

// GET /conversation: C (not in A<->B) tries to read it by guessing pair A,B
r = await api("GET", "/conversation", { token: tokenC, params: { otherId: String(userA._id) } });
check("C reading A<->B conversation -> null (blocked)", r.status === 200 && r.data === null, `status=${r.status} data=${JSON.stringify(r.data)}`);

// C's own conversation list does NOT include A<->B
r = await api("GET", "/conversations", { token: tokenC });
check("C's conversation list excludes A<->B", r.status === 200 && !r.data.some((c) => String(c._id) === String(convAB._id)), `status=${r.status} count=${Array.isArray(r.data) ? r.data.length : "?"}`);

// notifications/read restricted to own conversations
r = await api("POST", "/conversations/read", { token: tokenC, body: { userId: String(userC._id), conversationId: String(convAB._id) } });
const convCheck = await Conversation.findById(convAB._id).lean();
const anyRead = convCheck.messages.some((m) => m.read === true);
check("C cannot mark A<->B messages read", r.status === 200 && !anyRead, `status=${r.status} anyRead=${anyRead}`);

// GET /conversation works for the actual participant (A)
r = await api("GET", "/conversation", { token: tokenA, params: { otherId: String(userB._id) } });
check("A can read own conversation with B", r.status === 200 && r.data !== null, `status=${r.status}`);

console.log("\n=== 5. /loggedinuser + email-fallback backfill ===\n");
r = await api("GET", "/loggedinuser", { token: tokenB });
check("B (no firebaseUid) -> 200 via email fallback", r.status === 200 && r.data.email === emails[1], `status=${r.status}`);
const bAfter = await User.findById(userB._id).lean();
check("B's firebaseUid backfilled after request", bAfter.firebaseUid === uids[emails[1]], `firebaseUid=${bAfter.firebaseUid}`);

console.log("\n=== 6. /register uses token identity (not body email/ids) ===\n");
const newEmail = "authtest-new@twiller.test";
try { const u = await auth.getUserByEmail(newEmail); await auth.deleteUser(u.uid); } catch {}
const fbNew = await auth.createUser({ email: newEmail, password: PASS, displayName: "New" });
const tokenNew = await firebaseSignIn(newEmail, PASS);
r = await api("POST", "/register", { token: tokenNew, body: { username: "authtestnew", displayName: "Auth Test New", avatar: "https://i.imgur.com/new.png", email: "forged@evil.test", firebaseUid: "forged-uid" } });
const newUser = await User.findOne({ email: newEmail }).lean();
check("register -> 201", r.status === 201, `status=${r.status}`);
check("register stores token email, not forged body email", !!newUser && newUser.email === newEmail, `email=${newUser?.email}`);
check("register stores real firebaseUid, not forged body value", !!newUser && newUser.firebaseUid === fbNew.uid, `firebaseUid=${newUser?.firebaseUid}`);
check("register ignores forged body firebaseUid", !!newUser && newUser.firebaseUid !== "forged-uid", "");
// idempotent re-register
r = await api("POST", "/register", { token: tokenNew, body: { username: "authtestnew", displayName: "X", avatar: "https://i.imgur.com/x.png" } });
check("re-register idempotent -> 200 (same user)", r.status === 200 && r.data.email === newEmail, `status=${r.status}`);

console.log("\n=== 7. Notifications use token identity ===\n");
r = await api("GET", "/notifications", { token: tokenA });
check("GET /notifications (A token, no userId) -> 200", r.status === 200 && Array.isArray(r.data), `status=${r.status}`);
r = await api("GET", "/notifications/unread-count", { token: tokenA });
check("GET /notifications/unread-count -> 200 with count", r.status === 200 && typeof r.data.count === "number", `status=${r.status}`);
r = await api("POST", "/notifications/read", { token: tokenA, body: { userId: String(userB._id) } });
check("POST /notifications/read -> 200", r.status === 200, `status=${r.status}`);

console.log("\n=== summary ===");
const failed = results.filter((x) => !x.ok);
console.log(`${results.length - failed.length}/${results.length} passed, ${failed.length} failed`);
if (failed.length) {
  console.log("FAILED:", failed.map((f) => f.name).join("; "));
  process.exitCode = 1;
}

// --- cleanup ---
await User.deleteMany({ email: { $in: [...emails, newEmail] } });
await Tweet.deleteMany({ author: { $in: [userA._id, userB._id, userC._id] } });
await Comment.deleteMany({ author: { $in: [userA._id, userB._id, userC._id] } });
await Notification.deleteMany({ recipient: { $in: [userA._id, userB._id, userC._id] } });
await Conversation.deleteMany({ participants: { $in: [userA._id, userB._id, userC._id] } });
for (const e of [...emails, newEmail]) {
  try { const u = await auth.getUserByEmail(e); await auth.deleteUser(u.uid); } catch {}
}
await mongoose.disconnect();
console.log("cleanup done");
