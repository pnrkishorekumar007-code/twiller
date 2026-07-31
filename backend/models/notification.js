import mongoose from "mongoose";

const NotificationSchema = mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["like", "retweet", "follow"],
    required: true,
  },
  tweet: { type: mongoose.Schema.Types.ObjectId, ref: "Tweet", default: null },
  read: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Notification", NotificationSchema);
