import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
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
    const tweet = await Tweet.find().sort({ timestamp: -1 }).limit(50).populate("author");
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
//  LIKE / UNLIKE TWEET
app.post("/like/:tweeted", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweeted);
    const alreadyLiked = tweet.likedBy.includes(userId);
    if (alreadyLiked) {
      tweet.likes -= 1;
      tweet.likedBy.pull(userId);
    } else {
      tweet.likes += 1;
      tweet.likedBy.push(userId);
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
    const alreadyRetweeted = tweet.retweetedBy.includes(userId);
    if (alreadyRetweeted) {
      tweet.retweets -= 1;
      tweet.retweetedBy.pull(userId);
    } else {
      tweet.retweets += 1;
      tweet.retweetedBy.push(userId);
    }
    await tweet.save();
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});