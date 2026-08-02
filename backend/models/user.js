import mongoose from "mongoose";
const UserSchema = mongoose.Schema({
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
    enum: ["en", "es", "hi", "pt", "zh", "fr"],
    default: "en",
  },
  planRenewedAt: { type: Date, default: Date.now },
  tweetCount: { type: Number, default: 0 },
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  followedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tweet" }],
});

export default mongoose.model("User", UserSchema);
