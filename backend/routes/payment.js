import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import User from "../models/user.js";
import Subscription from "../models/subscription.js";
import { sendInvoiceEmail } from "../utils/mailer.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const router = express.Router();

const PLAN_AMOUNTS = {
  bronze: 10000,
  silver: 30000,
  gold: 100000,
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function isPaymentWindowOpen() {
  const nowIST = dayjs().tz("Asia/Kolkata");
  return nowIST.hour() === 10;
}

function verifySignature({ orderId, paymentId, signature }) {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expectedSignature === signature;
}

router.post("/create-order", async (req, res) => {
  try {
    const { userId, plan } = req.body;

    if (!userId || !plan) {
      return res
        .status(400)
        .json({ error: "userId and plan are required" });
    }

    if (!PLAN_AMOUNTS[plan]) {
      return res
        .status(400)
        .json({ error: "Invalid plan. Choose bronze, silver, or gold." });
    }

    if (!isPaymentWindowOpen()) {
      return res.status(403).json({
        error:
          "Payments are only accepted between 10:00 AM and 11:00 AM IST. Please try again then.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const amount = PLAN_AMOUNTS[plan];
    const receipt = `receipt_${userId}_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
    });

    await Subscription.create({
      razorpayOrderId: order.id,
      userId: user._id,
      plan,
      amount,
      status: "created",
    });

    return res.status(200).json({
      orderId: order.id,
      amount,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({ error: "Failed to create payment order" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      plan,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment verification data" });
    }

    const signatureValid = verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!signatureValid) {
      await Subscription.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: "failed" }
      );
      return res.status(400).json({ error: "Payment signature verification failed" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await Subscription.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: "paid",
        razorpayPaymentId: razorpay_payment_id,
        plan,
      }
    );

    user.plan = plan;
    user.tweetCount = 0;
    user.planRenewedAt = new Date();
    await user.save();

    try {
      await sendInvoiceEmail({
        to: user.email,
        username: user.username,
        plan,
        amount: PLAN_AMOUNTS[plan],
        paymentId: razorpay_payment_id,
        date: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      });
    } catch (emailErr) {
      console.error("Invoice email failed:", emailErr);
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ error: "Failed to verify payment" });
  }
});

export default router;
