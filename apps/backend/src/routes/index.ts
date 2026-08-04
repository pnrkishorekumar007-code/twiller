import { Router } from "express";
import { verifyAuth } from "@middleware/verify-auth.middleware";
import {
  validateRegister,
  validatePost,
  validateComment,
  validateMessage,
  validateProfileUpdate,
  validateConversationCreate,
  validateMongoId,
  validateQuery,
} from "@validators";
import {
  registerUser,
  getLoggedInUser,
  getUsers,
  searchUsers,
  getUserById,
  updateProfile,
  getTrends,
} from "@controllers/auth.controller";
import {
  createTweet,
  getTweets,
  getUserTweets,
  likeTweet,
  retweet,
} from "@controllers/tweet.controller";
import {
  getComments,
  createComment,
} from "@controllers/comment.controller";
import {
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
} from "@controllers/notification.controller";
import {
  getConversations,
  getConversation,
  createConversation,
  sendMessage,
  markConversationRead,
} from "@controllers/conversation.controller";
import {
  toggleFollow,
  toggleBookmark,
  getBookmarks,
} from "@controllers/social.controller";
import {
  requestAudioOtp,
  verifyAudioOtp,
  createAudioTweet,
} from "@controllers/audio.controller";
import { audioUpload } from "@controllers/audio.controller";
import {
  requestLanguageOtp,
  verifyLanguageOtp,
} from "@controllers/language.controller";

const router = Router();

// Health check
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Auth routes
router.post("/register", validateRegister, registerUser);
router.get("/loggedinuser", verifyAuth, getLoggedInUser);
router.get("/users", verifyAuth, getUsers);
router.get("/users/search", verifyAuth, searchUsers);
router.get("/users/:id", verifyAuth, validateMongoId(), getUserById);
router.patch("/userdata/:email", verifyAuth, validateProfileUpdate, updateProfile);

// Trends
router.get("/trends", getTrends);

// Follow/Bookmark
router.post("/follow/:targetId", verifyAuth, validateMongoId("targetId"), toggleFollow);
router.post("/bookmark/:tweetId", verifyAuth, validateMongoId("tweetId"), toggleBookmark);
router.get("/bookmarks", verifyAuth, getBookmarks);

// Tweet routes
router.post("/post", verifyAuth, validatePost, createTweet);
router.get("/post", verifyAuth, validateQuery, getTweets);
router.get("/post/user/:userId", verifyAuth, validateMongoId("userId"), getUserTweets);
router.post("/like/:id", verifyAuth, validateMongoId("id"), likeTweet);
router.post("/retweet/:id", verifyAuth, validateMongoId("id"), retweet);

// Comment routes
router.get("/comments/:tweetId", verifyAuth, validateMongoId("tweetId"), getComments);
router.post("/comments/:tweetId", verifyAuth, validateMongoId("tweetId"), validateComment, createComment);

// Notification routes
router.get("/notifications", verifyAuth, getNotifications);
router.get("/notifications/unread-count", verifyAuth, getUnreadCount);
router.post("/notifications/read", verifyAuth, markNotificationsRead);

// Conversation/Message routes
router.get("/conversations", verifyAuth, getConversations);
router.get("/conversation", verifyAuth, getConversation);
router.post("/conversation", verifyAuth, validateConversationCreate, createConversation);
router.post("/message", verifyAuth, validateMessage, sendMessage);
router.post("/conversations/read", verifyAuth, markConversationRead);

// Audio Tweet routes
router.post("/audio/request-otp", verifyAuth, requestAudioOtp);
router.post("/audio/verify-otp", verifyAuth, verifyAudioOtp);
router.post("/audio/post", verifyAuth, audioUpload.single("audio"), createAudioTweet);

// Language routes
router.post("/language/request-otp", verifyAuth, requestLanguageOtp);
router.post("/language/verify-otp", verifyAuth, verifyLanguageOtp);

export default router;