import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// payment.js reads these at module load — set them before importing.
process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";
process.env.RAZORPAY_SECRET = "test_secret_123";
process.env.RESEND_API_KEY = "re_test_123";

const { verifySignature, PLAN_AMOUNTS } = await import("../routes/payment.js");
const { isPaymentWindowOpen } = await import("../utils/paymentWindow.js");
const mailer = await import("../utils/mailer.js");
const { sendPaymentEmails } = await import("../utils/paymentEmails.js");
const { activateOrExtendPlan } = await import("../utils/planLimits.js");

const DAY_MS = 24 * 60 * 60 * 1000;

test("plan amounts are correct (paise)", () => {
  assert.equal(PLAN_AMOUNTS.bronze, 10000); // ₹100
  assert.equal(PLAN_AMOUNTS.silver, 30000); // ₹300
  assert.equal(PLAN_AMOUNTS.gold, 100000); // ₹1000
});

test("payment window is open from 10:00 to 11:00 IST", () => {
  assert.equal(isPaymentWindowOpen(new Date("2026-08-05T04:29:59.000Z")), false); // 09:59:59 IST
  assert.equal(isPaymentWindowOpen(new Date("2026-08-05T04:30:00.000Z")), true); // 10:00:00 IST
  assert.equal(isPaymentWindowOpen(new Date("2026-08-05T05:29:59.000Z")), true); // 10:59:59 IST
  assert.equal(isPaymentWindowOpen(new Date("2026-08-05T05:30:00.000Z")), false); // 11:00:00 IST
});

test("valid signature is accepted", () => {
  const orderId = "order_abc";
  const paymentId = "pay_xyz";
  const signature = crypto
    .createHmac("sha256", "test_secret_123")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  assert.equal(verifySignature({ orderId, paymentId, signature }), true);
});

test("invalid signatures are rejected", () => {
  const orderId = "order_abc";
  const paymentId = "pay_xyz";
  const signature = crypto
    .createHmac("sha256", "test_secret_123")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  assert.equal(verifySignature({ orderId, paymentId, signature: "deadbeef" }), false);
  assert.equal(verifySignature({ orderId: "order_tampered", paymentId, signature }), false);
  assert.equal(verifySignature({ orderId, paymentId: "pay_tampered", signature }), false);
  assert.equal(verifySignature({ orderId, paymentId, signature: "" }), false);
  assert.equal(verifySignature({ orderId, paymentId, signature: null }), false);
});

test("invoice email contains invoice number, transaction id, plan, amount, IST date", () => {
  const html = mailer.buildInvoiceEmailHtml({
    username: "dev",
    plan: "gold",
    amount: 100000,
    paymentId: "pay_123",
    date: "05 Aug 2026",
    invoiceNumber: "INV-20260805-123456",
  });
  for (const snippet of [
    "Invoice Number",
    "INV-20260805-123456",
    "Transaction ID",
    "pay_123",
    "Gold",
    "₹1000.00",
    "Payment Date (IST)",
    "05 Aug 2026",
  ]) {
    assert.ok(html.includes(snippet), `invoice html should contain "${snippet}"`);
  }
});

test("subscription email contains plan, price, tweet limit, activation and expiry dates", () => {
  const html = mailer.buildSubscriptionDetailsEmailHtml({
    username: "dev",
    plan: "bronze",
    amount: 10000,
    paymentId: "pay_123",
    date: "05 Aug 2026",
    activationDate: "05 Aug 2026",
    expiryDate: "04 Sep 2026",
  });
  for (const snippet of [
    "Plan Name",
    "Bronze",
    "Price",
    "₹100.00",
    "Tweet Limit",
    "3 per month",
    "Activation Date (IST)",
    "05 Aug 2026",
    "Expiry Date (IST)",
    "04 Sep 2026",
  ]) {
    assert.ok(html.includes(snippet), `subscription html should contain "${snippet}"`);
  }
});

test("unlimited plans show Unlimited in subscription email", () => {
  const html = mailer.buildSubscriptionDetailsEmailHtml({
    username: "dev",
    plan: "gold",
    amount: 100000,
    paymentId: "pay_123",
    date: "05 Aug 2026",
    activationDate: "05 Aug 2026",
    expiryDate: "04 Sep 2026",
  });
  assert.ok(html.includes("Unlimited per month"));
});

test("email sending flow resolves even when the transport fails", async () => {
  const originalSend = mailer.resend.emails.send;
  const emailData = {
    invoice: {
      to: "user@example.com",
      username: "dev",
      plan: "bronze",
      amount: 10000,
      paymentId: "pay_123",
      date: "05 Aug 2026",
      invoiceNumber: "INV-1",
    },
    subscription: {
      to: "user@example.com",
      username: "dev",
      plan: "bronze",
      amount: 10000,
      paymentId: "pay_123",
      date: "05 Aug 2026",
      activationDate: "05 Aug 2026",
      expiryDate: "04 Sep 2026",
    },
  };
  try {
    mailer.resend.emails.send = async () => {
      throw new Error("SMTP down");
    };
    const results = await sendPaymentEmails(emailData);
    assert.deepEqual(results, [false, false]);
  } finally {
    mailer.resend.emails.send = originalSend;
  }
});

test("email sending flow reports success when the transport works", async () => {
  const originalSend = mailer.resend.emails.send;
  const emailData = {
    invoice: {
      to: "user@example.com",
      username: "dev",
      plan: "bronze",
      amount: 10000,
      paymentId: "pay_123",
      date: "05 Aug 2026",
      invoiceNumber: "INV-1",
    },
    subscription: {
      to: "user@example.com",
      username: "dev",
      plan: "bronze",
      amount: 10000,
      paymentId: "pay_123",
      date: "05 Aug 2026",
      activationDate: "05 Aug 2026",
      expiryDate: "04 Sep 2026",
    },
  };
  try {
    mailer.resend.emails.send = async () => ({ data: { id: "email_1" } });
    const results = await sendPaymentEmails(emailData);
    assert.deepEqual(results, [true, true]);
  } finally {
    mailer.resend.emails.send = originalSend;
  }
});

test("successful payment flow activates a 30-day plan", () => {
  const now = Date.parse("2026-08-05T10:30:00.000Z");
  const user = { plan: "free", planActivatedAt: null, planExpiresAt: null };
  const { activatedAt, expiresAt } = activateOrExtendPlan(user, "silver", now);
  assert.equal(user.plan, "silver");
  assert.equal(user.tweetCount, 0);
  assert.equal(activatedAt.getTime(), now);
  assert.equal(expiresAt.getTime(), now + 30 * DAY_MS);
});
