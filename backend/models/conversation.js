import mongoose from "mongoose";

const ConversationSchema = mongoose.Schema({
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ],
  messages: [
    {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      content: { type: String, required: true, maxlength: 500 },
      timestamp: { type: Date, default: Date.now },
      read: { type: Boolean, default: false },
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Conversation", ConversationSchema);
