import mongoose from "mongoose";

const SubscriptionSchema = mongoose.Schema({
  razorpayOrderId: { type: String, required: true, unique: true },
  razorpayPaymentId: { type: String, default: null },
  invoiceNumber: { type: String, default: null },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  plan: { type: String, enum: ["bronze", "silver", "gold"], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  status: {
    type: String,
    enum: ["created", "paid", "failed"],
    default: "created",
  },
  createdAt: { type: Date, default: Date.now },
});

SubscriptionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Subscription", SubscriptionSchema);
