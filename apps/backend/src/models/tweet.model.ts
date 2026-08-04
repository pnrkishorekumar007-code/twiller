import mongoose, { Document, Schema, Types } from "mongoose";

export interface ITweet extends Document {
  author: Types.ObjectId;
  content?: string;
  likes: number;
  retweets: number;
  comments: number;
  likedBy: Types.ObjectId[];
  retweetedBy: Types.ObjectId[];
  image?: string | null;
  audio?: {
    url: string;
    durationSeconds: number;
  } | null;
  timestamp: Date;
}

const TweetSchema = new Schema<ITweet>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, maxlength: 200 },
    likes: { type: Number, default: 0 },
    retweets: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    retweetedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    image: { type: String, default: null },
    audio: {
      url: { type: String },
      durationSeconds: { type: Number },
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

TweetSchema.index({ timestamp: -1 });
TweetSchema.index({ author: 1, timestamp: -1 });
TweetSchema.index({ content: "text" });

export const Tweet = mongoose.model<ITweet>("Tweet", TweetSchema);
export default Tweet;