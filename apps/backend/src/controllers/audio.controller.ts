import { AuthenticatedRequest } from "@middleware/verify-auth.middleware";
import { Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import multer from "multer";
import { parseBuffer } from "music-metadata";
import { getStorage } from "firebase-admin/storage";
import { AudioOtp } from "@models";
import { Tweet } from "@models";
import { sendAudioUploadOtpEmail } from "@utils/mailer.utils";
import { getFirebaseAdmin } from "@services/firebase-admin.service";
import {
  hasReachedPlanLimit,
  resetPlanQuotaIfDue,
  incrementTweetCount,
} from "@services/plan-limits.service";
import { config } from "@config";

dayjs.extend(utc);
dayjs.extend(timezone);

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const OTP_GRANT_TTL_MS = 10 * 60 * 1000;
const MAX_DURATION_SECONDS = 300;
const MAX_FILE_BYTES = 100 * 1024 * 1024;

export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

function isAudioUploadWindowOpen(): boolean {
  const hour = dayjs().tz("Asia/Kolkata").hour();
  return hour >= 14 && hour < 19;
}

export async function requestAudioOtp(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!isAudioUploadWindowOpen()) {
      res.status(403).json({
        error: "Audio tweets can only be posted between 2:00 PM and 7:00 PM IST.",
      });
      return;
    }

    const user = req.authUser!;
    const otp = crypto.randomInt(100000, 999999);
    const otpHash = await bcrypt.hash(String(otp), 10);

    await AudioOtp.deleteOne({ user: user._id });
    await AudioOtp.create({
      user: user._id,
      otpHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

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

    res.status(200).json({ otpRequired: true });
  } catch (error) {
    console.error("request-otp error:", error);
    res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
}

export async function verifyAudioOtp(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.authUser!;
    const otp = (req.body.otp ?? "").toString().trim();

    if (!/^\d{6}$/.test(otp)) {
      res.status(400).json({ error: "OTP must be a 6-digit number" });
      return;
    }

    const otpDoc = await AudioOtp.findOne({ user: user._id });

    if (!otpDoc || otpDoc.expiresAt.getTime() < Date.now()) {
      if (otpDoc) await AudioOtp.deleteOne({ _id: otpDoc._id });
      res.status(400).json({ error: "OTP expired or not found. Please request a new code." });
      return;
    }

    const match = await bcrypt.compare(otp, otpDoc.otpHash);

    if (!match) {
      otpDoc.attempts += 1;
      if (otpDoc.attempts >= MAX_OTP_ATTEMPTS) {
        await AudioOtp.deleteOne({ _id: otpDoc._id });
        res.status(429).json({ error: "Too many attempts. Please request a new code." });
        return;
      }
      await otpDoc.save();
      res.status(400).json({ error: "Incorrect OTP" });
      return;
    }

    user.audioUploadVerifiedAt = new Date();
    await user.save();
    await AudioOtp.deleteOne({ _id: otpDoc._id });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("verify-otp error:", error);
    res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
}

export async function createAudioTweet(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!isAudioUploadWindowOpen()) {
      res.status(403).json({
        error: "Audio tweets can only be posted between 2:00 PM and 7:00 PM IST.",
      });
      return;
    }

    const user = req.authUser!;

    const verifiedAt = user.audioUploadVerifiedAt;
    if (
      !verifiedAt ||
      Date.now() - new Date(verifiedAt).getTime() > OTP_GRANT_TTL_MS
    ) {
      res.status(403).json({
        error: "Please verify with the emailed code before uploading.",
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No audio file provided." });
      return;
    }

    let durationSeconds: number | null = null;
    try {
      const metadata = await parseBuffer(req.file.buffer, req.file.mimetype);
      durationSeconds = metadata.format.duration;
    } catch (metaErr) {
      console.error("music-metadata parse failed:", metaErr.message);
    }

    if (!durationSeconds || durationSeconds > MAX_DURATION_SECONDS) {
      res.status(400).json({ error: "Audio must be 5 minutes or shorter." });
      return;
    }

    const now = Date.now();
    resetPlanQuotaIfDue(user, now);

    if (hasReachedPlanLimit(user)) {
      res.status(403).json({
        error: "Tweet limit reached for your plan. Upgrade to post more.",
      });
      return;
    }

    const app = getFirebaseAdmin();
    if (!app) {
      res.status(500).json({
        error: "Audio upload is unavailable (FIREBASE_SERVICE_ACCOUNT_KEY missing or invalid).",
      });
      return;
    }

    const bucket = getStorage(app).bucket();
    const filename = `audio-tweets/${user._id}-${Date.now()}.webm`;
    const file = bucket.file(filename);
    await file.save(req.file.buffer, { contentType: req.file.mimetype });

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

    incrementTweetCount(user);
    user.audioUploadVerifiedAt = null;
    await user.save();

    res.status(201).json(tweet);
  } catch (error) {
    console.error("audio post error:", error);
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "Audio file must be 100 MB or smaller." });
      return;
    }
    res.status(500).json({ error: "Failed to post audio tweet" });
  }
}