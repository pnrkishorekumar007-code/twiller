import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import Otp from "./models/otp.js";
import { sendOtpEmail } from "./services/otpEmail.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Twiller backend is running successfully");
});

const port = process.env.PORT || 5000;
const url = process.env.MONOGDB_URL;

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

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

const generateOtp = () => {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
};

// Send OTP
app.post("/send-otp", async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email || !purpose) {
      return res.status(400).send({ error: "Email and purpose are required" });
    }
    if (!["signup", "login"].includes(purpose)) {
      return res.status(400).send({ error: "Invalid purpose" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).send({ error: "Please enter a valid email" });
    }

    const normalizedEmail = email.toLowerCase();

    if (purpose === "signup") {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).send({ error: "An account with this email already exists" });
      }
    }

    // Replace any previous OTP for this email + purpose
    await Otp.deleteMany({ email: normalizedEmail, purpose });

    const code = generateOtp();
    const otp = new Otp({
      email: normalizedEmail,
      code,
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });
    await otp.save();

    await sendOtpEmail(normalizedEmail, code, purpose);

    return res.status(200).send({
      message: "OTP sent successfully",
      expiresIn: OTP_TTL_MS,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Verify OTP
app.post("/verify-otp", async (req, res) => {
  try {
    const { email, code, purpose } = req.body;

    if (!email || !code || !purpose) {
      return res.status(400).send({ error: "Email, code and purpose are required" });
    }

    const normalizedEmail = email.toLowerCase();
    const otp = await Otp.findOne({ email: normalizedEmail, purpose });

    if (!otp) {
      return res.status(400).send({ error: "No OTP found. Please request a new code." });
    }

    if (otp.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otp._id });
      return res.status(400).send({ error: "OTP has expired. Please request a new code." });
    }

    if (otp.code !== String(code).trim()) {
      otp.attempts += 1;
      if (otp.attempts >= MAX_ATTEMPTS) {
        await Otp.deleteOne({ _id: otp._id });
        return res.status(400).send({ error: "Too many failed attempts. Please request a new code." });
      }
      await otp.save();
      return res.status(400).send({ error: "Invalid OTP code. Please try again." });
    }

    await Otp.deleteOne({ _id: otp._id });

    if (purpose === "login") {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(400).send({ error: "No account found with this email" });
      }
      return res.status(200).send({ verified: true, user });
    }

    return res.status(200).send({ verified: true });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

//Register
app.post("/register", async (req, res) => {
  try {
    const existinguser = await User.findOne({ email: req.body.email });
    if (existinguser) {
      return res.status(200).send(existinguser);
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
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// update Profile
app.patch("/userupdate/:email", async (req, res) => {
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
// Tweet API

// POST
app.post("/post", async (req, res) => {
  try {
    const tweet = new Tweet(req.body);
    await tweet.save();
    return res.status(201).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// get all tweet
app.get("/post", async (req, res) => {
  try {
    const tweet = await Tweet.find().sort({ timestamp: -1 }).populate("author");
    return res.status(200).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
//  LIKE TWEET
app.post("/like/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet.likedBy.includes(userId)) {
      tweet.likes += 1;
      tweet.likedBy.push(userId);
      await tweet.save();
    }
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// retweet 
app.post("/retweet/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet.retweetedBy.includes(userId)) {
      tweet.retweets += 1;
      tweet.retweetedBy.push(userId);
      await tweet.save();
    }
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});