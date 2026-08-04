import mongoose, { Document, Schema, Types } from "mongoose";

export type NotificationType = "like" | "retweet" | "follow";

export interface INotification extends Document {
  recipient: Types.ObjectId;
  actor: Types.ObjectId;
  type: NotificationType;
  tweet?: Types.ObjectId | null;
  read: boolean;
  timestamp: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["like", "retweet", "follow"],
      required: true,
    },
    tweet: { type: Schema.Types.ObjectId, ref: "Tweet", default: null },
    read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, timestamp: -1 });
NotificationSchema.index({ recipient: 1, read: 1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
export default Notification;