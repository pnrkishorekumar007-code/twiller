import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import multer from "multer";
import { parseBuffer } from "music-metadata";
import { getStorage } from "firebase-admin/storage";
import AudioOtp from "../models/audioOtp.js";
import Tweet from "../models/tweet.js";
import { sendAudioUploadOtpEmail } from "../utils/mailer.js";
import { verifyAuth } from "../middleware/verifyAuth.js";
import getFirebaseAdmin from "../utils/firebaseAdmin.js";
import {
  PLAN_LIMITS,
  resetPlanQuotaIfDue,
} from "../utils/planLimits.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const router = express.Router();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 5;
const OTP_GRANT_TTL_MS = 10 * 60 * 1000; // 10 minutes between verify and upload
const MAX_DURATION_SECONDS = 300; // 5 minutes
const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

function isAudioUploadWindowOpen() {
  const hour = dayjs().tz("Asia/Kolkata").hour();
  return hour >= 14 && hour < 19; // 2:00 PM–6:59:59 PM IST
}

router.post("/request-otp", verifyAuth, async (req, res) => {
  try {
    if (!isAudioUploadWindowOpen()) {
      return res.status(403).json({
        error: "Audio tweets can only be posted between 2:00 PM and 7:00 PM IST.",
      });
    }

    const user = req.authUser;
    const otp = crypto.randomInt(100000, 999999);
    const otpHash = await bcrypt.hash(String(otp), 10);

    await AudioOtp.deleteOne({ user: user._id });
    await AudioOtp.create({
      user: user._id,
      otpHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    // Respond first, send the OTP email in the background so a slow/misconfigured
    // SMTP connection can't hang the request. Delivery failure is logged server-side.
    sendAudioUploadOtpEmail({
      to: user.email,
      username: user.username,
      otp,
    }).catch((emailErr) => {
      console.error(
        `[audioTweet] Failed to send OTP email to ${user.email}:`,
        emailErr.message
      );
    });

    return res.status(200).json({ otpRequired: true });
  } catch (error) {
    console.error("request-otp error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

router.post("/verify-otp", verifyAuth, async (req, res) => {
  try {
    const user = req.authUser;
    const otp = (req.body.otp ?? "").toString().trim();

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "OTP must be a 6-digit number" });
    }

    const otpDoc = await AudioOtp.findOne({ user: user._id });

    if (!otpDoc || otpDoc.expiresAt.getTime() < Date.now()) {
      if (otpDoc) await AudioOtp.deleteOne({ _id: otpDoc._id });
      return res
        .status(400)
        .json({ error: "OTP expired or not found. Please request a new code." });
    }

    const match = await bcrypt.compare(otp, otpDoc.otpHash);

    if (!match) {
      otpDoc.attempts += 1;
      if (otpDoc.attempts >= MAX_OTP_ATTEMPTS) {
        await AudioOtp.deleteOne({ _id: otpDoc._id });
        return res
          .status(429)
          .json({ error: "Too many attempts. Please request a new code." });
      }
      await otpDoc.save();
      return res.status(400).json({ error: "Incorrect OTP" });
    }

    user.audioUploadVerifiedAt = new Date();
    await user.save();
    await AudioOtp.deleteOne({ _id: otpDoc._id });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("verify-otp error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

router.post(
  "/post",
  verifyAuth,
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!isAudioUploadWindowOpen()) {
        return res.status(403).json({
          error:
            "Audio tweets can only be posted between 2:00 PM and 7:00 PM IST.",
        });
      }

      const user = req.authUser;

      const verifiedAt = user.audioUploadVerifiedAt;
      if (
        !verifiedAt ||
        Date.now() - new Date(verifiedAt).getTime() > OTP_GRANT_TTL_MS
      ) {
        return res.status(403).json({
          error: "Please verify with the emailed code before uploading.",
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided." });
      }

      let durationSeconds = null;
      try {
        const metadata = await parseBuffer(req.file.buffer, req.file.mimetype);
        durationSeconds = metadata.format.duration;
      } catch (metaErr) {
        console.error("music-metadata parse failed:", metaErr.message);
      }

      if (!durationSeconds || durationSeconds > MAX_DURATION_SECONDS) {
        return res
          .status(400)
          .json({ error: "Audio must be 5 minutes or shorter." });
      }

      const now = Date.now();
      resetPlanQuotaIfDue(user, now);

      const limit = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.free;
      if (user.tweetCount >= limit) {
        return res.status(403).send({
          error: "Tweet limit reached for your plan. Upgrade to post more.",
        });
      }

      const app = getFirebaseAdmin();
      if (!app) {
        return res.status(500).json({
          error:
            "Audio upload is unavailable (FIREBASE_SERVICE_ACCOUNT_KEY missing or invalid).",
        });
      }

      const bucket = getStorage(app).bucket();
      const filename = `audio-tweets/${user._id}-${Date.now()}.webm`;
      const file = bucket.file(filename);
      await file.save(req.file.buffer, { contentType: req.file.mimetype });

      // makePublic() relies on the legacy per-object ACL system, which is
      // disabled on buckets with uniform bucket-level access (the default for
      // newer Firebase Storage buckets) — it throws there. Signed URLs don't
      // depend on ACLs, so use one instead. Effectively permanent for this app.
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "01-01-2100",
      });

      const content = (req.body.content || "").toString().trim();
      const tweet = new Tweet({
        author: user._id,
        content: content || undefined,
        audio: { url, durationSeconds },
      });
      await tweet.save();

      user.tweetCount += 1;
      user.audioUploadVerifiedAt = null;
      await user.save();

      return res.status(201).json(tweet);
    } catch (error) {
      console.error("audio post error:", error);
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ error: "Audio file must be 100 MB or smaller." });
      }
      return res.status(500).json({ error: "Failed to post audio tweet" });
    }
  }
);

export default router;
