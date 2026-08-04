import mongoose, { Document, Schema, Types } from "mongoose";

export interface ILanguageOtp extends Document {
  user: Types.ObjectId;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
  targetLanguage: string;
}

const LanguageOtpSchema = new Schema<ILanguageOtp>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    targetLanguage: { type: String, required: true },
  },
  { timestamps: true }
);

LanguageOtpSchema.index({ user: 1 });

export const LanguageOtp = mongoose.model<ILanguageOtp>(
  "LanguageOtp",
  LanguageOtpSchema
);
export default LanguageOtp;