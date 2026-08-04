import { AuthenticatedRequest } from "@middleware/verify-auth.middleware";
import { Response } from "express";
import { Notification } from "@models";

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.authUser!._id;
    const notifications = await Notification.find({ recipient: userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate("actor", "displayName username avatar")
      .populate({
        path: "tweet",
        select: "content image timestamp author",
        populate: { path: "author", select: "displayName username avatar verified" },
      });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.authUser!._id;
    const count = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });
    res.status(200).json({ count });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function markNotificationsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.authUser!._id;
    await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}