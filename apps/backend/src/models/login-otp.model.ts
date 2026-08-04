import mongoose, { Document, Schema, Types } from "mongoose";

export interface ILoginOtp extends Document {
  user: Types.ObjectId;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
}

const LoginOtpSchema = new Schema<ILoginOtp>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

LoginOtpSchema.index({ user: 1 });

export const LoginOtp = mongoose.model<ILoginOtp>("LoginOtp", LoginOtpSchema);
export default LoginOtp;