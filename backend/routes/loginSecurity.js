import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import LoginHistory from "../models/loginHistory.js";
import LoginOtp from "../models/loginOtp.js";
import { getDeviceInfo, isChrome } from "../utils/deviceInfo.js";
import { sendLoginOtpEmail } from "../utils/mailer.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const router = express.Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function isMobileLoginAllowed() {
  const hour = dayjs().tz("Asia/Kolkata").hour();
  return hour >= 10 && hour < 13; // 10:00 AM – 12:59:59 PM IST
}

router.post("/login-session", verifyAuth, async (req, res) => {
  try {
    const user = req.authUser;
    const info = getDeviceInfo(req);

    if (info.device === "mobile" && !isMobileLoginAllowed()) {
      return res
        .status(403)
        .json({ blocked: true, reason: "mobile_time_window" });
    }

    if (isChrome(info.browser)) {
      const otp = crypto.randomInt(100000, 999999);
      const otpHash = await bcrypt.hash(String(otp), 10);

      await LoginOtp.deleteOne({ user: user._id });
      await LoginOtp.create({
        user: user._id,
        otpHash,
        attempts: 0,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      });

      try {
        await sendLoginOtpEmail({
          to: user.email,
          username: user.username,
          otp,
        });
      } catch (emailErr) {
        console.error("Login OTP email failed to send:", emailErr);
        await LoginOtp.deleteOne({ user: user._id });
        return res.status(500).json({
          error:
            "Could not send your login verification email. Please try again.",
        });
      }

      return res.status(200).json({ otpRequired: true });
    }

    // Microsoft browsers (Edge/IE) and any other browser log in directly.
    await LoginHistory.create({
      user: user._id,
      browser: info.browser,
      browserVersion: info.browserVersion,
      os: info.os,
      device: info.device,
      ip: info.ip,
      otpVerified: false,
    });

    return res.status(200).json({ otpRequired: false, success: true });
  } catch (error) {
    console.error("login-session error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

router.post("/verify-login-otp", verifyAuth, async (req, res) => {
  try {
    const user = req.authUser;
    const otp = (req.body.otp ?? "").toString().trim();

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "OTP must be a 6-digit number" });
    }

    const otpDoc = await LoginOtp.findOne({ user: user._id });

    if (!otpDoc || otpDoc.expiresAt.getTime() < Date.now()) {
      if (otpDoc) await LoginOtp.deleteOne({ _id: otpDoc._id });
      return res
        .status(400)
        .json({ error: "OTP expired or not found. Please log in again." });
    }

    const match = await bcrypt.compare(otp, otpDoc.otpHash);

    if (!match) {
      otpDoc.attempts += 1;
      if (otpDoc.attempts >= MAX_OTP_ATTEMPTS) {
        await LoginOtp.deleteOne({ _id: otpDoc._id });
        return res
          .status(429)
          .json({ error: "Too many attempts. Please log in again." });
      }
      await otpDoc.save();
      return res.status(400).json({ error: "Incorrect OTP" });
    }

    const info = getDeviceInfo(req);

    await LoginHistory.create({
      user: user._id,
      browser: info.browser,
      browserVersion: info.browserVersion,
      os: info.os,
      device: info.device,
      ip: info.ip,
      otpVerified: true,
    });

    await LoginOtp.deleteOne({ _id: otpDoc._id });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("verify-login-otp error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

router.get("/login-history", verifyAuth, async (req, res) => {
  try {
    const history = await LoginHistory.find({ user: req.authUser._id })
      .sort({ timestamp: -1 })
      .limit(20);
    res.status(200).json(history);
  } catch (error) {
    console.error("login-history error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

export default router;
