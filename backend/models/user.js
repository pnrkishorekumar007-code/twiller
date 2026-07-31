import mongoose from "mongoose";
const UserSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  avatar: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: "", unique: true, sparse: true },
  bio: { type: String, default: "" },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  joinedDate: { type: Date, default: Date.now },
  lastPasswordResetRequestAt: { type: Date, default: null },
  plan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },
  planRenewedAt: { type: Date, default: Date.now },
  tweetCount: { type: Number, default: 0 },
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  followedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tweet" }],
});

export default mongoose.model("User", UserSchema);
