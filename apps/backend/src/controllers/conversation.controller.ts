import { AuthenticatedRequest } from "@middleware/verify-auth.middleware";
import { Response } from "express";
import { Conversation } from "@models";
import { User } from "@models";
import { hasReachedMessageLimit, incrementMessageCount } from "@services/plan-limits.service";

export async function getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.authUser!._id;
    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate("participants", "displayName username avatar");
    res.status(200).json(conversations);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function getConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.authUser!._id;
    const { otherId } = req.query;
    if (!otherId) {
      res.status(400).json({ error: "otherId is required" });
      return;
    }
    const conversation = await Conversation.findOne({
      participants: { $all: [userId, otherId] },
    }).populate("participants", "displayName username avatar");
    res.status(200).json(conversation);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function createConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.authUser!._id;
    const { otherId } = req.body;
    if (!otherId) {
      res.status(400).json({ error: "otherId is required" });
      return;
    }
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, otherId] },
    }).populate("participants", "displayName username avatar");
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, otherId],
        messages: [],
      });
      await conversation.populate("participants", "displayName username avatar");
    }
    res.status(200).json(conversation);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.authUser!._id;
    const { otherId, content } = req.body;
    if (!otherId) {
      res.status(400).json({ error: "otherId is required" });
      return;
    }
    if (!content || !content.trim()) {
      res.status(400).json({ error: "Message content is required" });
      return;
    }
    if (content.length > 500) {
      res.status(400).json({ error: "Message content must be 500 characters or less" });
      return;
    }

    const author = req.authUser!;
    if (hasReachedMessageLimit(author)) {
      res.status(403).json({
        error: "Daily message limit reached for your plan. Upgrade to send more.",
      });
      return;
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, otherId] },
    });
    if (!conversation) {
      const other = await User.findById(otherId);
      if (!other) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      conversation = new Conversation({
        participants: [userId, otherId],
        messages: [],
      });
    }
    conversation.messages.push({ sender: userId, content });
    conversation.updatedAt = new Date();
    await conversation.save();

    incrementMessageCount(author);
    await author.save();

    res.status(201).json(conversation);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function markConversationRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.authUser!._id;
    const { conversationId } = req.body;
    if (!conversationId) {
      res.status(400).json({ error: "conversationId is required" });
      return;
    }
    await Conversation.updateOne(
      { _id: conversationId, participants: userId },
      { $set: { "messages.$[m].read": true } },
      { arrayFilters: [{ "m.sender": { $ne: userId }, "m.read": false }] }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}