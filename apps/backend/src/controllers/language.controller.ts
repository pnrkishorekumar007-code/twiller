import { AuthenticatedRequest } from "@middleware/verify-auth.middleware";
import { Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getAuth } from "firebase-admin/auth";
import { LanguageOtp } from "@models";
import { User } from "@models";
import { sendLanguageOtpEmail } from "@utils/mailer.utils";
import { getFirebaseAdmin } from "@services/firebase-admin.service";
import { normalizePhone, toE164 } from "@utils/phone.utils";
import { config } from "@config";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "hi",
  "pt",
  "ta",
  "zh",
  "fr",
] as const;
const EMAIL_OTP_LANGUAGES = ["fr"] as const;
const LANGUAGE_NAMES = {
  en: "English",
  es: "Español",
  hi: "हिन्दी",
  pt: "Português",
  ta: "தமிழ்",
  zh: "中文",
  fr: "Français",
} as const;

export async function requestLanguageOtp(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.authUser!;
    const targetLanguage = (req.body.targetLanguage ?? "").toString().trim();

    if (!SUPPORTED_LANGUAGES.includes(targetLanguage as any)) {
      res.status(400).json({ error: "invalid" });
      return;
    }

    if (!EMAIL_OTP_LANGUAGES.includes(targetLanguage as any)) {
      if (!user.phone) {
        res.status(400).json({ error: "no_phone" });
        return;
      }
      const phone = toE164(user.phone);
      if (!phone) {
        res.status(400).json({ error: "no_phone" });
        return;
      }
      res.status(200).json({ channel: "phone", otpRequired: true, phone });
      return;
    }

    const otp = crypto.randomInt(100000, 999999);
    const otpHash = await bcrypt.hash(String(otp), 10);

    await LanguageOtp.deleteOne({ user: user._id });
    await LanguageOtp.create({
      user: user._id,
      otpHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      targetLanguage,
    });

    sendLanguageOtpEmail({
      to: user.email,
      username: user.username,
      otp,
      targetLanguage: LANGUAGE_NAMES[targetLanguage as keyof typeof LANGUAGE_NAMES] ?? targetLanguage,
    }).catch((emailErr) => {
      console.error(
        `[language] Failed to send OTP email to ${user.email}:`,
        emailErr.message
      );
    });

    res.status(200).json({ channel: "email", otpRequired: true });
  } catch (error) {
    console.error("language request-otp error:", error);
    res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
}

export async function verifyLanguageOtp(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.authUser!;
    const targetLanguage = (req.body.targetLanguage ?? "").toString().trim();

    if (!SUPPORTED_LANGUAGES.includes(targetLanguage as any)) {
      res.status(400).json({ error: "invalid" });
      return;
    }

    if (EMAIL_OTP_LANGUAGES.includes(targetLanguage as any)) {
      const otp = (req.body.otp ?? "").toString().trim();

      if (!/^\d{6}$/.test(otp)) {
        res.status(400).json({ error: "invalid" });
        return;
      }

      const otpDoc = await LanguageOtp.findOne({ user: user._id });

      if (!otpDoc || otpDoc.expiresAt.getTime() < Date.now()) {
        if (otpDoc) await LanguageOtp.deleteOne({ _id: otpDoc._id });
        res.status(400).json({ error: "expired" });
        return;
      }

      if (otpDoc.targetLanguage !== targetLanguage) {
        res.status(400).json({ error: "expired" });
        return;
      }

      const match = await bcrypt.compare(otp, otpDoc.otpHash);

      if (!match) {
        otpDoc.attempts += 1;
        if (otpDoc.attempts >= MAX_OTP_ATTEMPTS) {
          await LanguageOtp.deleteOne({ _id: otpDoc._id });
          res.status(429).json({ error: "tooMany" });
          return;
        }
        await otpDoc.save();
        res.status(400).json({ error: "incorrect" });
        return;
      }

      user.language = targetLanguage;
      await user.save();

      await LanguageOtp.deleteOne({ _id: otpDoc._id });

      res.status(200).json({ success: true, user });
      return;
    }

    if (!user.phone) {
      res.status(400).json({ error: "no_phone" });
      return;
    }

    const firebaseToken = (req.body.firebaseToken ?? "").toString().trim();
    if (!firebaseToken) {
      res.status(400).json({ error: "invalid" });
      return;
    }

    const app = getFirebaseAdmin();
    if (!app) {
      console.error(
        "Language change blocked: Firebase Admin SDK is not initialized."
      );
      res.status(500).json({
        error: "Something went wrong. Please try again later.",
      });
      return;
    }

    let decoded;
    try {
      decoded = await getAuth(app).verifyIdToken(firebaseToken);
    } catch (error) {
      console.error("Phone auth token verification failed:", (error as Error).message);
      res.status(401).json({ error: "invalid" });
      return;
    }

    const verifiedPhone = normalizePhone(decoded.phone_number);
    if (!verifiedPhone || verifiedPhone !== user.phone) {
      res.status(400).json({ error: "incorrect" });
      return;
    }

    user.language = targetLanguage;
    await user.save();

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("language verify-otp error:", error);
    res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
}