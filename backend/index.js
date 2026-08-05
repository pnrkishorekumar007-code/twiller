import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import "./loadEnv.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import Notification from "./models/notification.js";
import Conversation from "./models/conversation.js";
import Comment from "./models/comment.js";
import paymentRouter from "./routes/payment.js";
import passwordResetRouter from "./routes/passwordReset.js";
import loginSecurityRouter from "./routes/loginSecurity.js";
import audioTweetRouter from "./routes/audioTweet.js";
import languageRouter from "./routes/language.js";
import { verifyAuth } from "./middleware/verifyAuth.js";
import getFirebaseAdmin from "./utils/firebaseAdmin.js";
import { getAuth } from "firebase-admin/auth";
import { normalizePhone } from "./utils/phone.js";
import { escapeRegex } from "./utils/escapeRegex.js";
import {
  getTweetLimit,
  validateSubscription,
  resetQuotaIfNeeded,
  consumeQuotaSlot,
  releaseQuotaSlot,
} from "./utils/planLimits.js";

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Tiller backend is running successfully");
});

app.get("/health", (req, res) => {
  let firebaseStatus = "not initialized";
  try {
    const admin = getFirebaseAdmin();
    firebaseStatus = admin ? "configured" : "missing or invalid FIREBASE_SERVICE_ACCOUNT_KEY";
  } catch (err) {
    firebaseStatus = "error: " + err.message;
  }
  res.status(200).json({
    status: "ok",
    firebaseAdmin: firebaseStatus,
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    razorpayKey:
      process.env.RAZORPAY_KEY_ID &&
      (process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET)
        ? "configured"
        : "missing",
    smtp: process.env.SMTP_HOST ? "configured" : "missing",
    port: process.env.PORT || "default",
  });
});

const port = process.env.PORT || 5000;
const url = process.env.MONGODB_URL;
console.log("Mongo URI:", process.env.MONGODB_URL);

if (
  !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
) {
  console.warn(
    "⚠️  SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing). " +
      "OTP emails will fall back to Resend and FAIL for any recipient other than pnrkishorekumar007@gmail.com. " +
      "Set SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER and SMTP_PASS (Gmail app password) in this deployment."
  );
}

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

//Register (auth bootstrap: links a freshly created Firebase account to a Mongo doc)
app.post("/register", async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const app = getFirebaseAdmin();
    if (!app) {
      return res.status(500).json({
        error:
          "Server authentication is misconfigured (FIREBASE_SERVICE_ACCOUNT_KEY missing or invalid).",
      });
    }

    const decoded = await getAuth(app).verifyIdToken(token);

    let existinguser = await User.findOne({ firebaseUid: decoded.uid });
    if (!existinguser && decoded.email) {
      existinguser = await User.findOne({ email: decoded.email });
      if (existinguser) {
        existinguser.firebaseUid = decoded.uid;
        await existinguser.save();
      }
    }
    if (existinguser) {
      return res.status(200).send(existinguser);
    }
    if (req.body.username) {
      const existingUsername = await User.findOne({ username: req.body.username });
      if (existingUsername) {
        return res.status(409).send({ error: "Username already taken" });
      }
    }

    let normalizedPhone = null;
    if (req.body.phone) {
      normalizedPhone = normalizePhone(req.body.phone);
      if (!normalizedPhone) {
        return res.status(400).send({ error: "Invalid phone number format" });
      }
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone) {
        return res.status(409).send({ error: "Phone number is already registered" });
      }
    }

    const newUserData = {
      username: req.body.username,
      displayName: req.body.displayName,
      avatar: req.body.avatar,
      email: decoded.email,
      firebaseUid: decoded.uid,
    };
    if (normalizedPhone) {
      newUserData.phone = normalizedPhone;
    }
    const newUser = new User(newUserData);
    try {
      await newUser.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        return res
          .status(409)
          .send({ error: "Username or phone number is already registered" });
      }
      throw saveError;
    }
    return res.status(201).send(newUser);
  } catch (error) {
    console.error("[register] Registration failed:", {
      code: error.code || (error?.errorInfo?.code ?? null),
      message: error.message,
    });
    if (
      error.code === "auth/id-token-expired" ||
      error.code === "auth/argument-error"
    ) {
      return res.status(401).json({ error: "Invalid or expired auth token" });
    }
    return res.status(400).send({ error: error.message });
  }
});
// loggedinuser
app.get("/loggedinuser", verifyAuth, async (req, res) => {
  try {
    return res.status(200).send(req.authUser);
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
// TRENDS (hashtag counts from recent tweets)
app.get("/trends", async (req, res) => {
  try {
    const tweets = await Tweet.find({ content: { $regex: /#/, $ne: null } })
      .select("content timestamp")
      .sort({ timestamp: -1 })
      .limit(200);
    const counts = {};
    for (const t of tweets) {
      // Audio-only tweets have no content; guard against undefined.
      const tags = (t.content || "").match(/#[\w]+/g) || [];
      for (const tag of tags) {
        const key = tag.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    const trends = Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return res.status(200).send(trends);
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
        { username: { $regex: escapeRegex(q), $options: "i" } },
        { displayName: { $regex: escapeRegex(q), $options: "i" } },
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
app.post("/follow/:targetId", verifyAuth, async (req, res) => {
  try {
    const userId = req.authUser._id;
    if (String(userId) === String(req.params.targetId)) {
      return res.status(400).send({ error: "Invalid follow request" });
    }
    const target = await User.findById(req.params.targetId);
    if (!target) {
      return res.status(404).send({ error: "User not found" });
    }
    const follower = req.authUser;

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
app.post("/bookmark/:tweetId", verifyAuth, async (req, res) => {
  try {
    const userId = req.authUser._id;
    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) {
      return res.status(404).send({ error: "Tweet not found" });
    }
    const user = req.authUser;
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
app.get("/bookmarks", verifyAuth, async (req, res) => {
  try {
    const user = req.authUser;
    const bookmarks = user?.bookmarks || [];
    const tweets = await Tweet.find({ _id: { $in: bookmarks } })
      .sort({ timestamp: -1 })
      .populate("author", "displayName username avatar bio verified");
    return res.status(200).send(tweets);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// update Profile (only your own, only profile fields)
app.patch("/userdata/:email", verifyAuth, async (req, res) => {
  try {
    const { email } = req.params;
    if (String(req.authUser.email).toLowerCase() !== String(email).toLowerCase()) {
      return res.status(403).send({ error: "You can only edit your own profile" });
    }
    const {
      displayName,
      bio,
      location,
      website,
      avatar,
      phone,
      notificationsEnabled,
    } = req.body;

    let normalizedPhone;
    if (phone) {
      normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).send({ error: "Invalid phone number format" });
      }
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone && existingPhone._id.toString() !== req.authUser._id.toString()) {
        return res.status(400).send({ error: "Phone number already registered" });
      }
    }

    const setFields = {
      displayName,
      bio,
      location,
      website,
      avatar,
      notificationsEnabled,
    };
    if (normalizedPhone) setFields.phone = normalizedPhone;

    const updateOp = { $set: setFields };
    if (phone !== undefined && !normalizedPhone) {
      updateOp.$unset = { phone: "" };
    }

    const updated = await User.findByIdAndUpdate(
      req.authUser._id,
      updateOp,
      { new: true, upsert: false }
    );
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// Payment API
app.use("/api/payment", paymentRouter);
app.use("/payment", paymentRouter);
// Auth API
app.use("/auth", passwordResetRouter);
app.use("/auth", loginSecurityRouter);
// Audio Tweet API
app.use("/audio", audioTweetRouter);
// Language API
app.use("/api", languageRouter);

// Tweet API

const TWEET_PAGE_SIZE = 50;

// POST
app.post("/post", verifyAuth, async (req, res) => {
  try {
    const { content, image } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).send({ error: "Tweet content is required" });
    }
    if (content.length > 200) {
      return res.status(400).send({
        error: "Tweet content must be 200 characters or less",
      });
    }

    const author = req.authUser;

    // Auto-downgrade expired plans and reset monthly quota when due.
    if (validateSubscription(author) || resetQuotaIfNeeded(author)) {
      await author.save();
    }

    const limit = getTweetLimit(author.plan);

    // Atomically reserve one posting slot. Checking and incrementing in a
    // single conditional update prevents two parallel requests from both
    // passing the limit check and exceeding the plan quota.
    const reserved = await consumeQuotaSlot(author._id, limit);
    if (!reserved) {
      return res.status(403).json({
        success: false,
        message: "Tweet limit reached. Please upgrade your plan.",
      });
    }

    const tweet = new Tweet({ content, image: image || null, author: author._id });
    try {
      await tweet.save();
    } catch (err) {
      await releaseQuotaSlot(author._id);
      throw err;
    }

    return res.status(201).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// get all tweet (supports optional `before` cursor for infinite scrolling)
app.get("/post", async (req, res) => {
  try {
    const { following, userId, q, before } = req.query;
    let query = {};
    if (before) {
      query.timestamp = { $lt: new Date(before) };
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
    const tweet = await Tweet.find(query).sort({ timestamp: -1 }).limit(TWEET_PAGE_SIZE).populate("author", "displayName username avatar bio verified");
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
      .populate("author", "displayName username avatar bio verified");
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
app.post("/comments/:tweetId", verifyAuth, async (req, res) => {
  try {
    const { content } = req.body;
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
      author: req.authUser._id,
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
app.post("/like/:tweeted", verifyAuth, async (req, res) => {
  try {
    const userId = req.authUser._id;
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
app.post("/retweet/:tweeted", verifyAuth, async (req, res) => {
  try {
    const userId = req.authUser._id;
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
app.get("/notifications", verifyAuth, async (req, res) => {
  try {
    const userId = req.authUser._id;
    const notifications = await Notification.find({ recipient: userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate("actor", "displayName username avatar")
      .populate({
        path: "tweet",
        select: "content image timestamp author",
        populate: { path: "author", select: "displayName username avatar verified" },
      });
    return res.status(200).send(notifications);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
app.get("/notifications/unread-count", verifyAuth, async (req, res) => {
  try {
    const userId = req.authUser._id;
    const count = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });
    return res.status(200).send({ count });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
app.post("/notifications/read", verifyAuth, async (req, res) => {
  try {
    const userId = req.authUser._id;
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
app.get("/conversations", verifyAuth, async (req, res) => {
  try {
    const userId = req.authUser._id;
    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate("participants", "displayName username avatar");
    return res.status(200).send(conversations);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
app.get("/conversation", verifyAuth, async (req, res) => {
  try {
    const userId = req.authUser._id;
    const { otherId } = req.query;
    if (!otherId) {
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
app.post("/conversation", verifyAuth, async (req, res) => {
  try {
    const userId = req.authUser._id;
    const { otherId } = req.body;
    if (!otherId) {
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
app.post("/message", verifyAuth, async (req, res) => {
  try {
    const userId = req.authUser._id;
    const { otherId, content } = req.body;
    if (!otherId) {
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
      const other = await User.findById(otherId);
      if (!other) {
        return res.status(404).send({ error: "User not found" });
      }
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
app.post("/conversations/read", verifyAuth, async (req, res) => {
  try {
    const userId = req.authUser._id;
    const { conversationId } = req.body;
    if (!conversationId) {
      return res
        .status(400)
        .send({ error: "userId and conversationId are required" });
    }
    await Conversation.updateOne(
      { _id: conversationId, participants: userId },
      { $set: { "messages.$[m].read": true } },
      { arrayFilters: [{ "m.sender": { $ne: userId }, "m.read": false }] }
    );
    return res.status(200).send({ success: true });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});