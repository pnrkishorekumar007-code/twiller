import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getAuth } from "firebase-admin/auth";
import LanguageOtp from "../models/languageOtp.js";
import { sendLanguageOtpEmail } from "../utils/mailer.js";
import getFirebaseAdmin from "../utils/firebaseAdmin.js";
import { normalizePhone, toE164 } from "../utils/phone.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const SUPPORTED_LANGUAGES = ["en", "es", "hi", "pt", "ta", "zh", "fr"];
// Languages verified with a server-generated email OTP (via Resend).
// All other supported languages are verified with Firebase Phone Auth (SMS).
const EMAIL_OTP_LANGUAGES = ["fr"];
const LANGUAGE_NAMES = {
  en: "English",
  es: "Español",
  hi: "हिन्दी",
  pt: "Português",
  ta: "தமிழ்",
  zh: "中文",
  fr: "Français",
};

router.post("/language/request-otp", verifyAuth, async (req, res) => {
  try {
    const user = req.authUser;
    const targetLanguage = (req.body.targetLanguage ?? "").toString().trim();

    if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
      return res.status(400).json({ error: "invalid" });
    }

    // The client can force the email channel (e.g. after Firebase Phone Auth
    // fails to start an SMS). Without the override, phone is used when the
    // account has a number and the target language isn't in EMAIL_OTP_LANGUAGES.
    const forceEmail = req.body.channel === "email";

    // Phone channel: the SMS + reCAPTCHA flow runs entirely in Firebase Phone
    // Auth on the client, so no server-side OTP is generated here. The ID token
    // produced after the code is confirmed is verified in /language/verify-otp.
    if (!forceEmail && !EMAIL_OTP_LANGUAGES.includes(targetLanguage)) {
      const phone = toE164(user.phone);
      if (phone) {
        return res
          .status(200)
          .json({ channel: "phone", otpRequired: true, phone });
      }
      // No usable phone number on the account: fall through to the email OTP
      // channel below so every user can still switch languages.
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
    console.log(
      `[language] Language OTP generated for ${user.email} (target: ${LANGUAGE_NAMES[targetLanguage] ?? targetLanguage})`
    );

    sendLanguageOtpEmail({
      to: user.email,
      username: user.username,
      otp,
      targetLanguage: LANGUAGE_NAMES[targetLanguage] ?? targetLanguage,
    }).catch((emailErr) => {
      console.error(
        `[language] Failed to send OTP email to ${user.email}:`,
        emailErr.message
      );
    });

    return res.status(200).json({ channel: "email", otpRequired: true });
  } catch (error) {
    console.error("language request-otp error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

router.post("/language/verify-otp", verifyAuth, async (req, res) => {
  try {
    const user = req.authUser;
    const targetLanguage = (req.body.targetLanguage ?? "").toString().trim();

    if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
      return res.status(400).json({ error: "invalid" });
    }

    const firebaseToken = (req.body.firebaseToken ?? "").toString().trim();

    // Phone channel: the OTP is verified by Firebase client-side; here we trust
    // the resulting ID token. Firebase only issues tokens with a phone_number
    // claim after the SMS code was entered correctly, and the phone must match
    // the number stored on the account.
    if (firebaseToken) {
      if (!user.phone) {
        return res.status(400).json({ error: "no_phone" });
      }

      const app = getFirebaseAdmin();
      if (!app) {
        console.error(
          "Language change blocked: Firebase Admin SDK is not initialized (FIREBASE_SERVICE_ACCOUNT_KEY missing)."
        );
        return res.status(500).json({
          error: "Something went wrong. Please try again later.",
        });
      }

      let decoded;
      try {
        decoded = await getAuth(app).verifyIdToken(firebaseToken);
      } catch (error) {
        console.error("Phone auth token verification failed:", error.message);
        return res.status(401).json({ error: "invalid" });
      }

      const verifiedPhone = normalizePhone(decoded.phone_number);
      if (!verifiedPhone || verifiedPhone !== user.phone) {
        return res.status(400).json({ error: "incorrect" });
      }

      user.language = targetLanguage;
      await user.save();

      return res.status(200).json({ success: true, user });
    }

    // Email channel: verify the server-generated OTP against the stored hash.
    // Works for every supported language (French by default, plus the fallback
    // for accounts without a usable phone number).
    const otp = (req.body.otp ?? "").toString().trim();

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "invalid" });
    }

    const otpDoc = await LanguageOtp.findOne({ user: user._id });

    if (!otpDoc || otpDoc.expiresAt.getTime() < Date.now()) {
      if (otpDoc) await LanguageOtp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ error: "expired" });
    }

    if (otpDoc.targetLanguage !== targetLanguage) {
      return res.status(400).json({ error: "expired" });
    }

    const match = await bcrypt.compare(otp, otpDoc.otpHash);

    if (!match) {
      otpDoc.attempts += 1;
      if (otpDoc.attempts >= MAX_OTP_ATTEMPTS) {
        await LanguageOtp.deleteOne({ _id: otpDoc._id });
        return res.status(429).json({ error: "tooMany" });
      }
      await otpDoc.save();
      return res.status(400).json({ error: "incorrect" });
    }

    user.language = targetLanguage;
    await user.save();

    await LanguageOtp.deleteOne({ _id: otpDoc._id });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("language verify-otp error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

export default router;
