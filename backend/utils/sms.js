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

// Trial accounts can only send messages built from a predefined Content
// Template (the free-form `body` path is rejected with
// "Invalid template name. Trial accounts can only use predefined SMS templates.").
// Set TWILIO_CONTENT_SID to the SID (HX...) of an approved template that has a
// single content variable holding the OTP (e.g. "Your Twiller code is {{1}}").
// A Messaging Service (MG...) is optional; if TWILIO_MESSAGING_SERVICE_SID is
// set it takes precedence over TWILIO_PHONE_NUMBER as the sender.
export async function sendSmsOtp({ to, otp }) {
  const client = getTwilioClient();
  const recipient = toE164(to);

  if (!client || !recipient || !process.env.TWILIO_PHONE_NUMBER) {
    console.log(
      `[sms] [dev-log fallback] OTP for ${to}: ${otp} (configure TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER to send real SMS)`
    );
    return { delivered: false, channel: "dev-log" };
  }

  const messageParams = {
    to: recipient,
    ...(process.env.TWILIO_MESSAGING_SERVICE_SID
      ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
      : { from: process.env.TWILIO_PHONE_NUMBER }),
  };

  if (process.env.TWILIO_CONTENT_SID) {
    messageParams.contentSid = process.env.TWILIO_CONTENT_SID;
    messageParams.contentVariables = JSON.stringify({ "1": otp });
  } else {
    messageParams.body = `Twiller: your language change verification code is ${otp}. It expires in 10 minutes.`;
  }

  try {
    await client.messages.create(messageParams);
    return { delivered: true, channel: "twilio" };
  } catch (error) {
    console.error(`[sms] Twilio send failed for ${to}:`, error.message);
    if (!process.env.TWILIO_CONTENT_SID) {
      console.log(
        "[sms] Tip: this looks like a trial account restriction. Create a predefined content template in the Twilio console and set TWILIO_CONTENT_SID, or upgrade/verify a recipient number."
      );
    }
    console.log(
      `[sms] [dev-log fallback] OTP for ${to}: ${otp} (Twilio send failed)`
    );
    return { delivered: false, channel: "dev-log" };
  }
}
