import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import User from "../models/user.js";
import Subscription from "../models/subscription.js";
import { isPaymentWindowOpen } from "../utils/paymentWindow.js";
import { activateOrExtendPlan } from "../utils/planLimits.js";
import { sendPaymentEmails } from "../utils/paymentEmails.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const router = express.Router();

// Amounts in paise. Never trust client-supplied amounts — they are derived
// exclusively from the plan the server validates.
export const PLAN_AMOUNTS = {
  bronze: 10000, // ₹100
  silver: 30000, // ₹300
  gold: 100000, // ₹1000
};

const RAZORPAY_SECRET =
  process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_SECRET,
});

const IST_TZ = "Asia/Kolkata";

export function verifySignature({ orderId, paymentId, signature }) {
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  if (
    typeof signature !== "string" ||
    expectedSignature.length !== signature.length
  ) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "utf8"),
    Buffer.from(signature, "utf8")
  );
}

function generateInvoiceNumber() {
  const date = dayjs().tz(IST_TZ).format("YYYYMMDD");
  return `INV-${date}-${crypto.randomInt(100000, 999999)}`;
}

function formatIST(date) {
  return dayjs(date).tz(IST_TZ).format("DD MMM YYYY");
}

router.post("/create-order", verifyAuth, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !PLAN_AMOUNTS[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan. Choose bronze, silver, or gold.",
      });
    }

    if (!isPaymentWindowOpen()) {
      return res.status(403).json({
        success: false,
        message:
          "Payments are allowed only between 10:00 AM and 11:00 AM IST.",
      });
    }

    const user = req.authUser;
    const amount = PLAN_AMOUNTS[plan];

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${user._id}_${Date.now()}`,
    });

    await Subscription.create({
      razorpayOrderId: order.id,
      userId: user._id,
      plan,
      amount,
      currency: "INR",
      status: "created",
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create payment order",
    });
  }
});

router.post("/verify", verifyAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification data",
      });
    }

    const subscription = await Subscription.findOne({
      razorpayOrderId: razorpay_order_id,
    });
    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: "Payment order not found",
      });
    }
    if (String(subscription.userId) !== String(req.authUser._id)) {
      return res.status(403).json({
        success: false,
        message: "This payment order does not belong to you",
      });
    }

    // Idempotent replay: an already-processed payment is returned as-is and
    // never re-credits the plan.
    if (subscription.status === "paid") {
      const user = await User.findById(subscription.userId);
      return res.status(200).json({ success: true, user });
    }

    if (
      !verifySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      })
    ) {
      subscription.status = "failed";
      await subscription.save();
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed",
      });
    }

    const user = await User.findById(subscription.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const invoiceNumber = generateInvoiceNumber();

    // Claim the payment atomically. Only one concurrent verify can flip
    // status created -> paid; the loser returns the already-upgraded user.
    const claimed = await Subscription.findOneAndUpdate(
      { _id: subscription._id, status: { $ne: "paid" } },
      {
        $set: {
          status: "paid",
          razorpayPaymentId: razorpay_payment_id,
          invoiceNumber,
        },
      },
      { new: true }
    );

    if (!claimed) {
      const fresh = await User.findById(subscription.userId);
      return res.status(200).json({ success: true, user: fresh });
    }

    // Plan + amount are taken from the server-created order, never the request.
    const now = new Date();
    const { activatedAt, expiresAt } = activateOrExtendPlan(
      user,
      claimed.plan,
      now.getTime()
    );

    user.paymentHistory = [...(user.paymentHistory || []), claimed._id];
    await user.save();

    // Emails run in the background — a failure here must never fail the payment.
    const paymentDate = formatIST(now);
    sendPaymentEmails({
      invoice: {
        to: user.email,
        username: user.username,
        plan: claimed.plan,
        amount: claimed.amount,
        paymentId: razorpay_payment_id,
        date: paymentDate,
        invoiceNumber: claimed.invoiceNumber,
      },
      subscription: {
        to: user.email,
        username: user.username,
        plan: claimed.plan,
        amount: claimed.amount,
        paymentId: razorpay_payment_id,
        date: paymentDate,
        activationDate: formatIST(activatedAt),
        expiryDate: formatIST(expiresAt),
      },
    }).catch((emailErr) => {
      console.error("Payment emails failed:", emailErr);
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify payment",
    });
  }
});

export { isPaymentWindowOpen };
export default router;
