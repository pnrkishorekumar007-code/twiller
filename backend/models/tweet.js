import mongoose from "mongoose";
const TweetSchema = mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, maxlength: 200 },
  likes: { type: Number, default: 0 },
  retweets: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  retweetedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  image: { type: String, default: null },
  audio: {
    url: { type: String },
    durationSeconds: { type: Number },
  },
  timestamp: { type: Date, default: Date.now },
});

// Feed queries sort by timestamp (cursor pagination) and filter by author.
TweetSchema.index({ timestamp: -1 });
TweetSchema.index({ author: 1, timestamp: -1 });

export default mongoose.model("Tweet", TweetSchema);
