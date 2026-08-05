import { Resend } from "resend";
import nodemailer from "nodemailer";
import dns from "node:dns";

// Hosts like smtp.gmail.com resolve to IPv6 first; servers without IPv6
// (Render free tier etc.) then fail with ENETUNREACH. Prefer IPv4 everywhere.
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Node < 17: keep the default resolution order
}

const PLAN_LIMITS = { free: 1, bronze: 3, silver: 5, gold: "Unlimited" };

export const resend = new Resend(process.env.RESEND_API_KEY);
// Dev/test sender. Swap to a verified-domain sender ("Twiller <noreply@yourdomain.com>")
// once a domain is verified in Resend. SMTP sends from the configured SMTP_USER.
const FROM_ADDRESS = "Twiller <onboarding@resend.dev>";

// SMTP is preferred when configured (delivers to any recipient). Resend is the
// fallback but, with the default onboarding sender, only delivers to the
// account owner's own address unless a domain is verified. The transport is
// created lazily so importing this module never requires credentials.
let smtpTransport = null;
function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;
  smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Fail fast and precisely: without these, nodemailer waits up to 2
    // minutes for a connection that a provider may silently drop (e.g.
    // Gmail refusing datacenter IPs), and callers only ever see "timed out".
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
  return smtpTransport;
}

function resetSmtpTransport() {
  if (smtpTransport) {
    try {
      smtpTransport.close();
    } catch {
      // transport already closed
    }
    smtpTransport = null;
  }
}

async function sendEmail({ to, subject, html }) {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpSecure = smtpPort === 465;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const info = await getSmtpTransport().sendMail({
          from: process.env.SMTP_USER,
          to,
          subject,
          html,
        });
        console.log(
          `[mail] Sent via SMTP (${smtpHost}:${smtpPort}${smtpSecure ? "s" : ""}) to ${to}: ${subject} (${info.messageId})`
        );
        return;
      } catch (err) {
        console.error(
          `[mail] SMTP send to ${to} failed (attempt ${attempt}/2, ${smtpHost}:${smtpPort}, secure=${smtpSecure}):`,
          err.code || err.responseCode || err.message
        );
        resetSmtpTransport();
        if (attempt === 2) throw err;
      }
    }
    return;
  }
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });
  if (error) {
    console.error(
      `[mail] Resend send to ${to} failed: ${error.message}` +
        " — add SMTP_HOST/SMTP_USER/SMTP_PASS or verify a Resend domain to reach non-owner recipients."
    );
    throw new Error(`Email delivery failed: ${error.message}`);
  }
  console.log(`[mail] Sent via Resend to ${to}: ${subject}`);
}

function planDisplayName(plan) {
  return (plan || "").charAt(0).toUpperCase() + (plan || "").slice(1);
}

function formatRupees(amountPaise) {
  return `₹${((amountPaise || 0) / 100).toFixed(2)}`;
}

function emailShell({ title, heading, bodyHtml }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background: #0f172a; color: #fff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Twiller</h1>
        <p style="margin: 4px 0 0; color: #94a3b8;">${title}</p>
      </div>
      <div style="padding: 24px;">${bodyHtml}</div>
      <div style="background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Twiller. All rights reserved.
      </div>
    </div>
  `;
}

function invoiceRow(label, value) {
  return `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${label}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;"><strong>${value}</strong></td>
    </tr>
  `;
}

export function buildInvoiceEmailHtml({
  username,
  plan,
  amount,
  paymentId,
  date,
  invoiceNumber,
}) {
  const planName = planDisplayName(plan);
  const bodyHtml = `
    <p>Hi <strong>@${username}</strong>,</p>
    <p>Thank you for upgrading to the <strong>${planName}</strong> plan. Your payment was received successfully.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      ${invoiceRow("Invoice Number", invoiceNumber || "—")}
      ${invoiceRow("Transaction ID", paymentId || "—")}
      ${invoiceRow("Plan Name", planName)}
      ${invoiceRow("Amount", formatRupees(amount))}
      ${invoiceRow("Payment Date (IST)", date)}
    </table>
    <p style="color: #6b7280; font-size: 13px;">Questions? Reply to this email and we'll be happy to help.</p>
  `;
  return emailShell({ title: "Payment Invoice", heading: planName, bodyHtml });
}

export function buildSubscriptionDetailsEmailHtml({
  username,
  plan,
  amount,
  activationDate,
  expiryDate,
}) {
  const planName = planDisplayName(plan);
  const tweetLimit =
    PLAN_LIMITS[plan] === Infinity ? "Unlimited" : PLAN_LIMITS[plan];
  const bodyHtml = `
    <p>Hi <strong>@${username}</strong>,</p>
    <p>Thank you for upgrading to the <strong>${planName}</strong> plan. Your subscription is now active.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      ${invoiceRow("Plan Name", planName)}
      ${invoiceRow("Price", formatRupees(amount))}
      ${invoiceRow("Tweet Limit", `${tweetLimit} per month`)}
      ${invoiceRow("Activation Date (IST)", activationDate || "—")}
      ${invoiceRow("Expiry Date (IST)", expiryDate || "—")}
    </table>
    <p style="color: #6b7280; font-size: 13px;">Your plan renews automatically unless cancelled.</p>
    <p style="color: #6b7280; font-size: 13px;">Questions? Reply to this email and we'll be happy to help.</p>
  `;
  return emailShell({ title: "Subscription Details", heading: planName, bodyHtml });
}

export async function sendInvoiceEmail({
  to,
  username,
  plan,
  amount,
  paymentId,
  date,
  invoiceNumber,
}) {
  await sendEmail({
    to,
    subject: `Twiller ${planDisplayName(plan)} Plan Invoice`,
    html: buildInvoiceEmailHtml({
      username,
      plan,
      amount,
      paymentId,
      date,
      invoiceNumber,
    }),
  });
}

export async function sendLoginOtpEmail({ to, username, otp }) {
  await sendEmail({
    to,
    subject: "Twiller Login Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; color: #fff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Twiller</h1>
          <p style="margin: 4px 0 0; color: #94a3b8;">Login Verification</p>
        </div>
        <div style="padding: 24px;">
          <p>Hi <strong>@${username}</strong>,</p>
          <p>Use the code below to finish signing in to Twiller:</p>
          <div style="margin: 24px 0; padding: 16px; background: #f1f5f9; border-radius: 8px; text-align: center;">
            <code style="font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: 4px;">${otp}</code>
          </div>
          <p>This code expires in <strong>10 minutes</strong>. If you didn't try to sign in, you can safely ignore this email.</p>
          <p style="color: #6b7280; font-size: 13px;">For security, we require this extra step for some logins.</p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Twiller. All rights reserved.
        </div>
      </div>
    `,
  });
}

export async function sendLanguageOtpEmail({ to, username, otp, targetLanguage }) {
  await sendEmail({
    to,
    subject: "Twiller Language Change Verification",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; color: #fff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Twiller</h1>
          <p style="margin: 4px 0 0; color: #94a3b8;">Language Change Verification</p>
        </div>
        <div style="padding: 24px;">
          <p>Hi <strong>@${username}</strong>,</p>
          <p>Use the code below to confirm changing your Twiller display language to <strong>${targetLanguage}</strong>:</p>
          <div style="margin: 24px 0; padding: 16px; background: #f1f5f9; border-radius: 8px; text-align: center;">
            <code style="font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: 4px;">${otp}</code>
          </div>
          <p>This code expires in <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #6b7280; font-size: 13px;">For security, we require this extra step before changing your language.</p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Twiller. All rights reserved.
        </div>
      </div>
    `,
  });
}

export async function sendAudioUploadOtpEmail({ to, username, otp }) {
  await sendEmail({
    to,
    subject: "Twiller Audio Tweet Verification",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; color: #fff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Twiller</h1>
          <p style="margin: 4px 0 0; color: #94a3b8;">Audio Tweet Verification</p>
        </div>
        <div style="padding: 24px;">
          <p>Hi <strong>@${username}</strong>,</p>
          <p>Use the code below to verify and post your audio tweet:</p>
          <div style="margin: 24px 0; padding: 16px; background: #f1f5f9; border-radius: 8px; text-align: center;">
            <code style="font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: 4px;">${otp}</code>
          </div>
          <p>This code expires in <strong>5 minutes</strong>. If you didn't try to post an audio tweet, you can safely ignore this email.</p>
          <p style="color: #6b7280; font-size: 13px;">Audio tweets can only be posted between 2:00 PM and 7:00 PM IST.</p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Twiller. All rights reserved.
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({ to, username, newPassword }) {
  await sendEmail({
    to,
    subject: "Twiller Password Reset",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; color: #fff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Twiller</h1>
          <p style="margin: 4px 0 0; color: #94a3b8;">Password Reset</p>
        </div>
        <div style="padding: 24px;">
          <p>Hi <strong>@${username}</strong>,</p>
          <p>Your password has been reset. Use the temporary password below to sign in:</p>
          <div style="margin: 24px 0; padding: 16px; background: #f1f5f9; border-radius: 8px; text-align: center;">
            <code style="font-size: 20px; font-weight: bold; color: #0f172a; letter-spacing: 1px;">${newPassword}</code>
          </div>
          <p>After signing in, please change your password to something you'll remember.</p>
          <p style="color: #6b7280; font-size: 13px;">If you didn't request this, you can safely ignore this email — your account may have been reset by someone who knows your email.</p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Twiller. All rights reserved.
        </div>
      </div>
    `,
  });
}

export async function sendSubscriptionDetailsEmail({
  to,
  username,
  plan,
  amount,
  paymentId,
  date,
  activationDate,
  expiryDate,
}) {
  await sendEmail({
    to,
    subject: `Twiller ${planDisplayName(plan)} Plan - Subscription Details`,
    html: buildSubscriptionDetailsEmailHtml({
      username,
      plan,
      amount,
      paymentId,
      date,
      activationDate,
      expiryDate,
    }),
  });
}
