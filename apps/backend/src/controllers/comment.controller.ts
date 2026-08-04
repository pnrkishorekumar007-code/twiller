import { AuthenticatedRequest } from "@middleware/verify-auth.middleware";
import { Response } from "express";
import { Comment } from "@models";
import { Tweet } from "@models";
import { hasReachedCommentLimit, incrementCommentCount } from "@services/plan-limits.service";

export async function getComments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const comments = await Comment.find({ tweet: req.params.tweetId })
      .sort({ timestamp: 1 })
      .populate("author", "displayName username avatar");
    res.status(200).json(comments);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function createComment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: "Comment content is required" });
      return;
    }
    if (content.length > 200) {
      res.status(400).json({ error: "Comment must be 200 characters or less" });
      return;
    }
    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) {
      res.status(404).json({ error: "Tweet not found" });
      return;
    }

    const author = req.authUser!;
    if (hasReachedCommentLimit(author)) {
      res.status(403).json({
        error: "Daily comment limit reached for your plan. Upgrade to comment more.",
      });
      return;
    }

    const comment = await Comment.create({
      tweet: tweet._id,
      author: author._id,
      content,
    });

    tweet.comments += 1;
    await tweet.save();

    incrementCommentCount(author);
    await author.save();

    const populated = await Comment.findById(comment._id).populate(
      "author",
      "displayName username avatar"
    );
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}