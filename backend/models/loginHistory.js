import mongoose from "mongoose";

const LoginHistorySchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  browser: { type: String, required: true },
  browserVersion: { type: String, default: "" },
  os: { type: String, required: true },
  device: { type: String, enum: ["desktop", "mobile", "tablet"], required: true },
  ip: { type: String, required: true },
  otpVerified: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

LoginHistorySchema.index({ user: 1, timestamp: -1 });

export default mongoose.model("LoginHistory", LoginHistorySchema);
