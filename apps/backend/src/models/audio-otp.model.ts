import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAudioOtp extends Document {
  user: Types.ObjectId;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
}

const AudioOtpSchema = new Schema<IAudioOtp>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

AudioOtpSchema.index({ user: 1 });

export const AudioOtp = mongoose.model<IAudioOtp>("AudioOtp", AudioOtpSchema);
export default AudioOtp;