import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Twiller <onboarding@resend.dev>";

export async function sendOtpEmail(email, code, purpose) {
  const subject =
    purpose === "signup"
      ? "Verify your Twiller account"
      : "Your Twiller login code";

  if (!process.env.RESEND_API_KEY) {
    console.log(`\n📩 [OTP ${purpose}] For ${email} -> code: ${code}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #0f1419;">Twiller</h2>
        <p style="color: #0f1419; font-size: 16px;">
          ${purpose === "signup" ? "Thanks for signing up!" : "Welcome back!"}
        </p>
        <p style="color: #0f1419; font-size: 16px;">
          Your verification code is:
        </p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f1419;">
          ${code}
        </div>
        <p style="color: #71717a; font-size: 14px; margin-top: 16px;">
          This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
