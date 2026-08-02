import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import LanguageOtp from "../models/languageOtp.js";
import { sendLanguageOtpEmail } from "../utils/mailer.js";
import { sendSmsOtp } from "../utils/sms.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const SUPPORTED_LANGUAGES = ["en", "es", "hi", "pt", "zh", "fr"];
const LANGUAGE_NAMES = {
  en: "English",
  es: "Español",
  hi: "हिन्दी",
  pt: "Português",
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

    let channel = "email";
    if (targetLanguage !== "fr") {
      if (!user.phone) {
        await LanguageOtp.deleteOne({ user: user._id });
        return res.status(400).json({ error: "no_phone" });
      }
      channel = "sms";
    }

    if (channel === "email") {
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
    } else {
      sendSmsOtp({ to: user.phone, otp }).catch((smsErr) => {
        console.error(`[language] Failed to send OTP SMS:`, smsErr.message);
      });
    }

    return res.status(200).json({ channel, otpRequired: true });
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
    const otp = (req.body.otp ?? "").toString().trim();
    const targetLanguage = (req.body.targetLanguage ?? "").toString().trim();

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "invalid" });
    }
    if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
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
