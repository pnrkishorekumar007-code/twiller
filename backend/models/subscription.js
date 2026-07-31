import mongoose from "mongoose";

const SubscriptionSchema = mongoose.Schema({
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: { type: String, default: null },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  plan: { type: String, enum: ["bronze", "silver", "gold"], required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["created", "paid", "failed"],
    default: "created",
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Subscription", SubscriptionSchema);
