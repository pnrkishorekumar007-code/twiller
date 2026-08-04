import { AuthenticatedRequest } from "@middleware/verify-auth.middleware";
import { Response } from "express";
import { Tweet, ITweet } from "@models";
import { User, IUser } from "@models";
import { escapeRegex } from "@utils/escape-regex.utils";
import { config } from "@config";
import {
  hasReachedPlanLimit,
  resetPlanQuotaIfDue,
  incrementTweetCount,
} from "@services/plan-limits.service";

const TWEET_PAGE_SIZE = 50;

export async function createTweet(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { content, image } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: "Tweet content is required" });
      return;
    }
    if (content.length > 200) {
      res.status(400).json({ error: "Tweet content must be 200 characters or less" });
      return;
    }

    const author = req.authUser!;

    resetPlanQuotaIfDue(author);
    await author.save();

    if (hasReachedPlanLimit(author)) {
      res.status(403).json({
        error: "Tweet limit reached for your plan. Upgrade to post more.",
      });
      return;
    }

    const tweet = new Tweet({ content, image: image || null, author: author._id });
    await tweet.save();

    incrementTweetCount(author);
    await author.save();

    res.status(201).json(tweet);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function getTweets(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { following, userId, q, before } = req.query;
    let query: any = {};
    if (before) {
      query.timestamp = { $lt: new Date(before as string) };
    }
    if (following === "true" && userId) {
      const user = await User.findById(userId).select("following");
      const followedIds = user?.following || [];
      query = {
        ...query,
        author: { $in: [...followedIds, userId] },
      };
    }
    if (q && q.toString().trim()) {
      query = {
        ...query,
        content: { $regex: escapeRegex(q.toString().trim()), $options: "i" },
      };
    }
    const tweets = await Tweet.find(query)
      .sort({ timestamp: -1 })
      .limit(TWEET_PAGE_SIZE)
      .populate("author", "displayName username avatar bio verified");
    res.status(200).json(tweets);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function getUserTweets(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const tweets = await Tweet.find({ author: req.params.userId })
      .sort({ timestamp: -1 })
      .populate("author", "displayName username avatar bio verified");
    res.status(200).json(tweets);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function likeTweet(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.authUser!._id;
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) {
      res.status(404).json({ error: "Tweet not found" });
      return;
    }
    const alreadyLiked = tweet.likedBy.some((id) => id.equals(userId));
    if (alreadyLiked) {
      tweet.likes -= 1;
      tweet.likedBy.pull(userId);
    } else {
      tweet.likes += 1;
      tweet.likedBy.push(userId);
      if (String(tweet.author) !== String(userId)) {
        const { Notification } = await import("@models");
        await Notification.create({
          recipient: tweet.author,
          actor: userId,
          type: "like",
          tweet: tweet._id,
        });
      }
    }
    await tweet.save();
    res.status(200).json(tweet);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function retweet(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.authUser!._id;
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) {
      res.status(404).json({ error: "Tweet not found" });
      return;
    }
    const alreadyRetweeted = tweet.retweetedBy.some((id) => id.equals(userId));
    if (alreadyRetweeted) {
      tweet.retweets -= 1;
      tweet.retweetedBy.pull(userId);
    } else {
      tweet.retweets += 1;
      tweet.retweetedBy.push(userId);
      if (String(tweet.author) !== String(userId)) {
        const { Notification } = await import("@models");
        await Notification.create({
          recipient: tweet.author,
          actor: userId,
          type: "retweet",
          tweet: tweet._id,
        });
      }
    }
    await tweet.save();
    res.status(200).json(tweet);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}