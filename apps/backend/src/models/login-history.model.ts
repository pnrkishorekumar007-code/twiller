import mongoose, { Document, Schema, Types } from "mongoose";

export type DeviceType = "desktop" | "mobile" | "tablet";

export interface ILoginHistory extends Document {
  user: Types.ObjectId;
  browser: string;
  browserVersion: string;
  os: string;
  device: DeviceType;
  ip: string;
  otpVerified: boolean;
  timestamp: Date;
}

const LoginHistorySchema = new Schema<ILoginHistory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    browser: { type: String, required: true },
    browserVersion: { type: String, default: "" },
    os: { type: String, required: true },
    device: { type: String, enum: ["desktop", "mobile", "tablet"], required: true },
    ip: { type: String, required: true },
    otpVerified: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

LoginHistorySchema.index({ user: 1, timestamp: -1 });

export const LoginHistory = mongoose.model<ILoginHistory>(
  "LoginHistory",
  LoginHistorySchema
);
export default LoginHistory;