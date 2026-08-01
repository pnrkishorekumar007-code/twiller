import { getAuth } from "firebase-admin/auth";
import getFirebaseAdmin from "../utils/firebaseAdmin.js";
import User from "../models/user.js";

export async function verifyAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const app = getFirebaseAdmin();
    if (!app) {
      return res.status(500).json({ error: "Auth service unavailable" });
    }

    const decoded = await getAuth(app).verifyIdToken(token);

    // Look up by firebaseUid first; fall back to email for users who
    // registered before this field existed, and backfill it once found.
    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email });
      if (user) {
        user.firebaseUid = decoded.uid;
        await user.save();
      }
    }

    if (!user) {
      return res.status(404).json({ error: "No matching account found" });
    }

    req.authUser = user; // the verified, trusted Mongo user doc
    next();
  } catch (error) {
    console.error("Auth verification failed:", error.message);
    return res.status(401).json({ error: "Invalid or expired auth token" });
  }
}
