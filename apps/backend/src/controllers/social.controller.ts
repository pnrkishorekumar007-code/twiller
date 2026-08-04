import { AuthenticatedRequest } from "@middleware/verify-auth.middleware";
import { Response } from "express";
import { User } from "@models";
import { Notification } from "@models";

export async function toggleFollow(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.authUser!._id;
    if (String(userId) === String(req.params.targetId)) {
      res.status(400).json({ error: "Invalid follow request" });
      return;
    }
    const target = await User.findById(req.params.targetId);
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const follower = req.authUser!;

    const alreadyFollowing = target.followedBy.some((id) => id.equals(userId));
    if (alreadyFollowing) {
      target.followedBy.pull(userId);
      follower.following.pull(target._id);
    } else {
      target.followedBy.push(userId);
      follower.following.push(target._id);
      await Notification.create({
        recipient: target._id,
        actor: userId,
        type: "follow",
      });
    }
    await Promise.all([target.save(), follower.save()]);
    res.status(200).json({ following: !alreadyFollowing });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function toggleBookmark(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.authUser!._id;
    const { Tweet } = await import("@models");
    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) {
      res.status(404).json({ error: "Tweet not found" });
      return;
    }
    const user = req.authUser!;
    const alreadyBookmarked = user.bookmarks.some((id) => id.equals(tweet._id));
    if (alreadyBookmarked) {
      user.bookmarks.pull(tweet._id);
    } else {
      user.bookmarks.push(tweet._id);
    }
    await user.save();
    res.status(200).json({ bookmarked: !alreadyBookmarked });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function getBookmarks(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.authUser!;
    const bookmarks = user.bookmarks || [];
    const { Tweet } = await import("@models");
    const tweets = await Tweet.find({ _id: { $in: bookmarks } })
      .sort({ timestamp: -1 })
      .populate("author", "displayName username avatar bio verified");
    res.status(200).json(tweets);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}