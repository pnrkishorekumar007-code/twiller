import mongoose from "mongoose";

const CommentSchema = mongoose.Schema({
  tweet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tweet",
    required: true,
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, maxlength: 200 },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Comment", CommentSchema);
