import mongoose, { Document, Schema, Types } from "mongoose";

export interface IUser extends Document {
  username: string;
  displayName: string;
  avatar: string;
  email: string;
  firebaseUid?: string;
  phone?: string;
  bio: string;
  location: string;
  website: string;
  joinedDate: Date;
  lastPasswordResetRequestAt?: Date | null;
  audioUploadVerifiedAt?: Date | null;
  notificationsEnabled: boolean;
  plan: "free" | "bronze" | "silver" | "gold";
  language: "en" | "es" | "hi" | "pt" | "ta" | "zh" | "fr";
  planRenewedAt: Date;
  tweetCount: number;
  commentCount: number;
  commentCountResetAt: Date;
  messageCount: number;
  messageCountResetAt: Date;
  following: Types.ObjectId[];
  followedBy: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    avatar: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    firebaseUid: { type: String, unique: true, sparse: true },
    phone: { type: String, default: undefined, unique: true, sparse: true },
    bio: { type: String, default: "" },
    location: { type: String, default: "" },
    website: { type: String, default: "" },
    joinedDate: { type: Date, default: Date.now },
    lastPasswordResetRequestAt: { type: Date, default: null },
    audioUploadVerifiedAt: { type: Date, default: null },
    notificationsEnabled: { type: Boolean, default: false },
    plan: {
      type: String,
      enum: ["free", "bronze", "silver", "gold"],
      default: "free",
    },
    language: {
      type: String,
      enum: ["en", "es", "hi", "pt", "ta", "zh", "fr"],
      default: "en",
    },
    planRenewedAt: { type: Date, default: Date.now },
    tweetCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    commentCountResetAt: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
    messageCountResetAt: { type: Date, default: Date.now },
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    followedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    bookmarks: [{ type: Schema.Types.ObjectId, ref: "Tweet" }],
  },
  { timestamps: true }
);

UserSchema.index({ username: "text", displayName: "text" });
UserSchema.index({ displayName: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);
export default User;