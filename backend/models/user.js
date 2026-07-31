import mongoose from "mongoose";
const UserSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  avatar: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  bio: { type: String, default: "" },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  joinedDate: { type: Date, default: Date.now },
  plan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },
  planRenewedAt: { type: Date, default: Date.now },
  tweetCount: { type: Number, default: 0 },
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  followedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

export default mongoose.model("User", UserSchema);
