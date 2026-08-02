// SMS delivery helper. Uses Twilio when credentials are configured;
// otherwise falls back to logging the OTP to the server console (dev mode)
// so language switching can be tested without a real SMS provider.
import twilio from "twilio";

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return null;
  }
  try {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } catch (error) {
    console.error("Failed to initialize Twilio client:", error.message);
    return null;
  }
  return twilioClient;
}

// Normalizes a stored Indian number (10-digit) into the E.164 form Twilio needs.
function toE164(phone) {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return null;
}

export async function sendSmsOtp({ to, otp }) {
  const client = getTwilioClient();
  const recipient = toE164(to);

  if (!client || !recipient || !process.env.TWILIO_PHONE_NUMBER) {
    console.log(
      `[sms] [dev-log fallback] OTP for ${to}: ${otp} (configure TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER to send real SMS)`
    );
    return { delivered: false, channel: "dev-log" };
  }

  try {
    await client.messages.create({
      body: `Twiller: your language change verification code is ${otp}. It expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: recipient,
    });
    return { delivered: true, channel: "twilio" };
  } catch (error) {
    console.error(`[sms] Twilio send failed for ${to}:`, error.message);
    console.log(
      `[sms] [dev-log fallback] OTP for ${to}: ${otp} (Twilio send failed)`
    );
    return { delivered: false, channel: "dev-log" };
  }
}
