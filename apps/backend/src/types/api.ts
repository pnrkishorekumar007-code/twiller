export type Plan = "free" | "bronze" | "silver" | "gold";

export interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  email: string;
  firebaseUid?: string;
  phone?: string;
  bio: string;
  location: string;
  website: string;
  joinedDate: string;
  plan: Plan;
  language: "en" | "es" | "hi" | "pt" | "ta" | "zh" | "fr";
  tweetCount: number;
  commentCount: number;
  commentCountResetAt: string;
  messageCount: number;
  messageCountResetAt: string;
  following: string[];
  followedBy: string[];
  bookmarks: string[];
  notificationsEnabled: boolean;
}

export interface Tweet {
  _id: string;
  author: User | string;
  content?: string;
  image?: string | null;
  audio?: { url: string; durationSeconds: number } | null;
  likes: number;
  retweets: number;
  comments: number;
  likedBy: string[];
  retweetedBy: string[];
  timestamp: string;
  verified?: boolean;
  bookmarked?: boolean;
}

export interface Comment {
  _id: string;
  tweet: string;
  author: User;
  content: string;
  timestamp: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  actor: User;
  type: "like" | "retweet" | "follow";
  tweet?: Tweet | null;
  read: boolean;
  timestamp: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  messages: Message[];
  updatedAt: string;
}

export interface Message {
  _id: string;
  sender: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export type PlanLimits = Record<Plan, number | null>;

export const PLAN_LIMITS: PlanLimits = {
  free: 1,
  bronze: 3,
  silver: 5,
  gold: null,
};