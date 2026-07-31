import express from "express";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import User from "../models/user.js";
import getFirebaseAdmin from "../utils/firebaseAdmin.js";
import { getAuth } from "firebase-admin/auth";
import { generatePassword } from "../utils/generatePassword.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const router = express.Router();

const GENERIC_SUCCESS = "If an account exists, a new password has been sent.";

function sameISTDay(a, b) {
  return dayjs(a).tz("Asia/Kolkata").format("YYYY-MM-DD") ===
    dayjs(b).tz("Asia/Kolkata").format("YYYY-MM-DD");
}

router.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: "identifier is required" });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.status(200).json({ message: GENERIC_SUCCESS });
    }

    if (user.lastPasswordResetRequestAt) {
      const lastRequest = new Date(user.lastPasswordResetRequestAt);
      if (sameISTDay(lastRequest, new Date())) {
        return res
          .status(429)
          .json({ error: "You can use this option only one time per day." });
      }
    }

    const app = getFirebaseAdmin();

    if (!app) {
      console.error(
        "Password reset blocked: Firebase Admin SDK is not initialized (FIREBASE_SERVICE_ACCOUNT_KEY missing)."
      );
      return res.status(500).json({ error: "Password reset is unavailable. Please try again later." });
    }

    const auth = getAuth(app);
    const newPassword = generatePassword(10);

    const firebaseUser = await auth.getUserByEmail(user.email);
    await auth.updateUser(firebaseUser.uid, { password: newPassword });

    user.lastPasswordResetRequestAt = new Date();
    await user.save();

    try {
      await sendPasswordResetEmail({
        to: user.email,
        username: user.username,
        newPassword,
      });
    } catch (emailErr) {
      console.error(
        `⚠️ Password reset email failed to send to ${user.email}. The password was already changed.`,
        emailErr
      );
    }

    return res.status(200).json({ message: GENERIC_SUCCESS });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

export default router;
