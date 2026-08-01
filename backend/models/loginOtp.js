import mongoose from "mongoose";

const LoginOtpSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

LoginOtpSchema.index({ user: 1 });

export default mongoose.model("LoginOtp", LoginOtpSchema);
