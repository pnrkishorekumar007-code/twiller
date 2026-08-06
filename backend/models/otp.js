import mongoose from "mongoose";

const OtpSchema = mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  code: { type: String, required: true },
  purpose: { type: String, enum: ["signup", "login"], required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now() },
});

OtpSchema.index({ email: 1, purpose: 1 });

export default mongoose.model("Otp", OtpSchema);
