import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import Notification from "./models/notification.js";
import Conversation from "./models/conversation.js";
import Comment from "./models/comment.js";
import paymentRouter from "./routes/payment.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Tiller backend is running successfully");
});

const port = process.env.PORT || 5000;
const url = process.env.MONGODB_URL;

mongoose
  .connect(url)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

//Register
app.post("/register", async (req, res) => {
  try {
    const existinguser = await User.findOne({ email: req.body.email });
    if (existinguser) {
      return res.status(200).send(existinguser);
    }
    if (req.body.username) {
      const existingUsername = await User.findOne({ username: req.body.username });
      if (existingUsername) {
        return res.status(409).send({ error: "Username already taken" });
      }
    }
    const newUser = new User(req.body);
    await newUser.save();
    return res.status(201).send(newUser);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// loggedinuser
app.get("/loggedinuser", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send({ error: "Email required" });
    }
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// list users for suggestions (excludes current user, includes self flag)
app.get("/users", async (req, res) => {
  try {
    const { email } = req.query;
    const users = await User.find({ email: { $ne: email } })
      .select("username displayName avatar bio plan following followedBy")
      .limit(6)
      .lean();
    return res.status(200).send(users);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// search users
app.get("/users/search", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) {
      return res.status(200).send([]);
    }
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: "i" } },
        { displayName: { $regex: q, $options: "i" } },
      ],
    })
      .select("username displayName avatar bio plan following followedBy")
      .limit(8)
      .lean();
    return res.status(200).send(users);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// get user by id
app.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "username displayName avatar bio location website joinedDate plan tweetCount following followedBy"
    );
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// FOLLOW / UNFOLLOW
app.post("/follow/:targetId", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || userId === req.params.targetId) {
      return res.status(400).send({ error: "Invalid follow request" });
    }
    const target = await User.findById(req.params.targetId);
    if (!target) {
      return res.status(404).send({ error: "User not found" });
    }
    const follower = await User.findById(userId);
    if (!follower) {
      return res.status(404).send({ error: "User not found" });
    }

    const alreadyFollowing = target.followedBy.some((id) =>
      id.equals(userId)
    );
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
    return res.status(200).send({ following: !alreadyFollowing });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// BOOKMARK / UNBOOKMARK
app.post("/bookmark/:tweetId", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) {
      return res.status(404).send({ error: "Tweet not found" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }
    const alreadyBookmarked = user.bookmarks.some((id) => id.equals(tweet._id));
    if (alreadyBookmarked) {
      user.bookmarks.pull(tweet._id);
    } else {
      user.bookmarks.push(tweet._id);
    }
    await user.save();
    return res.status(200).send({ bookmarked: !alreadyBookmarked });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// get bookmarked tweets
app.get("/bookmarks", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).send({ error: "userId is required" });
    }
    const user = await User.findById(userId).select("bookmarks");
    const bookmarks = user?.bookmarks || [];
    const tweets = await Tweet.find({ _id: { $in: bookmarks } })
      .sort({ timestamp: -1 })
      .populate("author");
    return res.status(200).send(tweets);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// update Profile
app.patch("/userdata/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const updated = await User.findOneAndUpdate(
      { email },
      { $set: req.body },
      { new: true, upsert: false }
    );
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// Payment API
app.use("/payment", paymentRouter);

// Tweet API

const PLAN_LIMITS = { free: 1, bronze: 3, silver: 5, gold: Infinity };
const PLAN_RESET_DAYS = 30;

// POST
app.post("/post", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).send({ error: "Tweet content is required" });
    }
    if (content.length > 200) {
      return res.status(400).send({
        error: "Tweet content must be 200 characters or less",
      });
    }

    const author = await User.findById(req.body.author);
    if (!author) {
      return res.status(404).send({ error: "User not found" });
    }

    const now = Date.now();
    if (now - new Date(author.planRenewedAt).getTime() >= PLAN_RESET_DAYS * 24 * 60 * 60 * 1000) {
      author.tweetCount = 0;
      author.planRenewedAt = new Date();
      await author.save();
    }

    const limit = PLAN_LIMITS[author.plan] ?? PLAN_LIMITS.free;
    if (author.tweetCount >= limit) {
      return res.status(403).send({
        error: "Tweet limit reached for your plan. Upgrade to post more.",
      });
    }

    const tweet = new Tweet(req.body);
    await tweet.save();

    author.tweetCount += 1;
    await author.save();

    return res.status(201).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// get all tweet
app.get("/post", async (req, res) => {
  try {
    const { following, userId, q } = req.query;
    let query = {};
    if (following === "true" && userId) {
      const user = await User.findById(userId).select("following");
      const followedIds = user?.following || [];
      query = {
        author: { $in: [...followedIds, userId] },
      };
    }
    if (q && q.toString().trim()) {
      query = {
        ...query,
        content: { $regex: q.toString().trim(), $options: "i" },
      };
    }
    const tweet = await Tweet.find(query).sort({ timestamp: -1 }).limit(50).populate("author");
    return res.status(200).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// get tweets by user
app.get("/post/user/:userId", async (req, res) => {
  try {
    const tweet = await Tweet.find({ author: req.params.userId })
      .sort({ timestamp: -1 })
      .populate("author");
    return res.status(200).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// COMMENTS
app.get("/comments/:tweetId", async (req, res) => {
  try {
    const comments = await Comment.find({ tweet: req.params.tweetId })
      .sort({ timestamp: 1 })
      .populate("author", "displayName username avatar");
    return res.status(200).send(comments);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
app.post("/comments/:tweetId", async (req, res) => {
  try {
    const { author, content } = req.body;
    if (!author) {
      return res.status(400).send({ error: "author is required" });
    }
    if (!content || !content.trim()) {
      return res.status(400).send({ error: "Comment content is required" });
    }
    if (content.length > 200) {
      return res.status(400).send({
        error: "Comment must be 200 characters or less",
      });
    }
    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) {
      return res.status(404).send({ error: "Tweet not found" });
    }
    const comment = await Comment.create({
      tweet: tweet._id,
      author,
      content,
    });
    tweet.comments += 1;
    await tweet.save();
    const populated = await Comment.findById(comment._id).populate(
      "author",
      "displayName username avatar"
    );
    return res.status(201).send(populated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
//  LIKE / UNLIKE TWEET
app.post("/like/:tweeted", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweeted);
    const alreadyLiked = tweet.likedBy.some((id) => id.equals(userId));
    if (alreadyLiked) {
      tweet.likes -= 1;
      tweet.likedBy.pull(userId);
    } else {
      tweet.likes += 1;
      tweet.likedBy.push(userId);
      if (String(tweet.author) !== String(userId)) {
        await Notification.create({
          recipient: tweet.author,
          actor: userId,
          type: "like",
          tweet: tweet._id,
        });
      }
    }
    await tweet.save();
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// RETWEET / UNRETWEET
app.post("/retweet/:tweeted", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweeted);
    const alreadyRetweeted = tweet.retweetedBy.some((id) => id.equals(userId));
    if (alreadyRetweeted) {
      tweet.retweets -= 1;
      tweet.retweetedBy.pull(userId);
    } else {
      tweet.retweets += 1;
      tweet.retweetedBy.push(userId);
      if (String(tweet.author) !== String(userId)) {
        await Notification.create({
          recipient: tweet.author,
          actor: userId,
          type: "retweet",
          tweet: tweet._id,
        });
      }
    }
    await tweet.save();
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// NOTIFICATIONS
app.get("/notifications", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).send({ error: "userId is required" });
    }
    const notifications = await Notification.find({ recipient: userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate("actor", "displayName username avatar")
      .populate("tweet", "content image timestamp");
    return res.status(200).send(notifications);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
app.get("/notifications/unread-count", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).send({ error: "userId is required" });
    }
    const count = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });
    return res.status(200).send({ count });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
app.post("/notifications/read", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).send({ error: "userId is required" });
    }
    await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );
    return res.status(200).send({ success: true });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// CONVERSATIONS / MESSAGES
app.get("/conversations", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).send({ error: "userId is required" });
    }
    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate("participants", "displayName username avatar");
    return res.status(200).send(conversations);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
app.get("/conversation", async (req, res) => {
  try {
    const { userId, otherId } = req.query;
    if (!userId || !otherId) {
      return res.status(400).send({ error: "userId and otherId are required" });
    }
    const conversation = await Conversation.findOne({
      participants: { $all: [userId, otherId] },
    }).populate("participants", "displayName username avatar");
    return res.status(200).send(conversation);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
app.post("/conversation", async (req, res) => {
  try {
    const { userId, otherId } = req.body;
    if (!userId || !otherId) {
      return res.status(400).send({ error: "userId and otherId are required" });
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
    return res.status(200).send(conversation);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
app.post("/message", async (req, res) => {
  try {
    const { userId, otherId, content } = req.body;
    if (!userId || !otherId) {
      return res.status(400).send({ error: "userId and otherId are required" });
    }
    if (!content || !content.trim()) {
      return res.status(400).send({ error: "Message content is required" });
    }
    if (content.length > 500) {
      return res.status(400).send({
        error: "Message content must be 500 characters or less",
      });
    }
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, otherId] },
    });
    if (!conversation) {
      conversation = new Conversation({
        participants: [userId, otherId],
        messages: [],
      });
    }
    conversation.messages.push({ sender: userId, content });
    conversation.updatedAt = new Date();
    await conversation.save();
    return res.status(201).send(conversation);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
app.post("/conversations/read", async (req, res) => {
  try {
    const { userId, conversationId } = req.body;
    if (!userId || !conversationId) {
      return res
        .status(400)
        .send({ error: "userId and conversationId are required" });
    }
    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { "messages.$[m].read": true } },
      { arrayFilters: [{ "m.sender": { $ne: userId }, "m.read": false }] }
    );
    return res.status(200).send({ success: true });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});