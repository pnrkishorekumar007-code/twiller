import nodemailer from "nodemailer";

const PLAN_LIMITS = { free: 1, bronze: 3, silver: 5, gold: "Unlimited" };

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

export async function sendInvoiceEmail({
  to,
  username,
  plan,
  amount,
  paymentId,
  date,
}) {
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  const tweetLimit = PLAN_LIMITS[plan];

  const mailOptions = {
    from: `"Twiller" <${process.env.SMTP_USER}>`,
    to,
    subject: `Twiller ${planName} Plan Invoice`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; color: #fff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Twiller</h1>
          <p style="margin: 4px 0 0; color: #94a3b8;">Payment Invoice</p>
        </div>
        <div style="padding: 24px;">
          <p>Hi <strong>@${username}</strong>,</p>
          <p>Thank you for upgrading to the <strong>${planName}</strong> plan. Your payment was received successfully.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Plan</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;"><strong>${planName}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Amount paid</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;"><strong>₹${(amount / 100).toFixed(2)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Payment ID</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${paymentId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Date</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Tweet limit</td>
              <td style="padding: 8px 0; text-align: right;"><strong>${tweetLimit} per month</strong></td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 13px;">Questions? Reply to this email and we'll be happy to help.</p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Twiller. All rights reserved.
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendLoginOtpEmail({ to, username, otp }) {
  const mailOptions = {
    from: `"Twiller" <${process.env.SMTP_USER}>`,
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
  };

  await transporter.sendMail(mailOptions);
}

export async function sendLanguageOtpEmail({ to, username, otp, targetLanguage }) {
  const mailOptions = {
    from: `"Twiller" <${process.env.SMTP_USER}>`,
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
  };

  await transporter.sendMail(mailOptions);
}

export async function sendAudioUploadOtpEmail({ to, username, otp }) {
  const mailOptions = {
    from: `"Twiller" <${process.env.SMTP_USER}>`,
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
  };

  await transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail({ to, username, newPassword }) {
  const mailOptions = {
    from: `"Twiller" <${process.env.SMTP_USER}>`,
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
  };

  await transporter.sendMail(mailOptions);
}

export async function sendSubscriptionDetailsEmail({
  to,
  username,
  plan,
  amount,
  paymentId,
  date,
}) {
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  const mailOptions = {
    from: `"Twiller" <${process.env.SMTP_USER}>`,
    to,
    subject: `Twiller ${planName} Plan - Subscription Details`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; color: #fff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Twiller</h1>
          <p style="margin: 4px 0 0; color: #94a3b8;">Subscription Details</p>
        </div>
        <div style="padding: 24px;">
          <p>Hi <strong>@${username}</strong>,</p>
          <p>Thank you for upgrading to the <strong>${planName}</strong> plan. Your subscription is now active.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Plan</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;"><strong>${planName}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Amount paid</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;"><strong>₹${(amount / 100).toFixed(2)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Payment ID</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${paymentId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Date</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${date}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 13px;">Questions? Reply to this email and we'll be happy to help.</p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Twiller. All rights reserved.
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
