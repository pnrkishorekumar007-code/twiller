import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMessage {
  sender: Types.ObjectId;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  messages: IMessage[];
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, maxlength: 500 },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [
      { type: Schema.Types.ObjectId, ref: "User", required: true },
    ],
    messages: [MessageSchema],
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1, updatedAt: -1 });
ConversationSchema.index({ participants: 1 });

export const Conversation = mongoose.model<IConversation>(
  "Conversation",
  ConversationSchema
);
export default Conversation;