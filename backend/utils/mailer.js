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
