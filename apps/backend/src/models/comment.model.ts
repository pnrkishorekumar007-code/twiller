import mongoose, { Document, Schema, Types } from "mongoose";

export interface IComment extends Document {
  tweet: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  timestamp: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    tweet: { type: Schema.Types.ObjectId, ref: "Tweet", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 200 },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CommentSchema.index({ tweet: 1, timestamp: 1 });

export const Comment = mongoose.model<IComment>("Comment", CommentSchema);
export default Comment;