import mongoose, { Document, Schema, Types } from "mongoose";

export type SubscriptionStatus = "created" | "paid" | "failed";
export type SubscriptionPlan = "bronze" | "silver" | "gold";

export interface ISubscription extends Document {
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  userId: Types.ObjectId;
  plan: SubscriptionPlan;
  amount: number;
  status: SubscriptionStatus;
  createdAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: String, enum: ["bronze", "silver", "gold"], required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model<ISubscription>(
  "Subscription",
  SubscriptionSchema
);
export default Subscription;