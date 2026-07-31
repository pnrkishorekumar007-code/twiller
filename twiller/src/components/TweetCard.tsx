"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  MoreHorizontal,
  Bookmark,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";

interface Author {
  _id?: string;
  displayName?: string;
  username?: string;
  avatar?: string;
  verified?: boolean;
}

export interface Tweet {
  _id: string;
  author?: Author | string;
  content?: string;
  image?: string;
  likedBy?: string[];
  retweetedBy?: string[];
  comments?: number;
  retweets?: number;
  likes?: number;
  createdAt?: string;
  timestamp?: string;
  verified?: boolean;
  bookmarked?: boolean;
}

export default function TweetCard({
  tweet,
  onBookmarkChange,
}: {
  tweet: Tweet;
  onBookmarkChange?: (tweetId: string, bookmarked: boolean) => void;
}) {
  const { user } = useAuth();
  const [tweetstate, settweetstate] = useState(tweet);
  const [bookmarked, setBookmarked] = useState(!!tweet.bookmarked);
  const likeTweet = async (tweetId: string) => {
    try {
      const res = await axiosInstance.post(`/like/${tweetId}`, {
        userId: user?._id,
      });
      settweetstate(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const retweetTweet = async (tweetId: string) => {
    try {
      const res = await axiosInstance.post(`/retweet/${tweetId}`, {
        userId: user?._id,
      });
      settweetstate(res.data);
    } catch (error) {
      console.log(error);
    }
  };
  const toggleBookmark = async (tweetId: string) => {
    if (!user) return;
    setBookmarked((prev) => !prev);
    try {
      const res = await axiosInstance.post(`/bookmark/${tweetId}`, {
        userId: user._id,
      });
      const isBookmarked = res.data.bookmarked;
      setBookmarked(isBookmarked);
      onBookmarkChange?.(tweetId, isBookmarked);
    } catch (error) {
      console.log(error);
      setBookmarked((prev) => !prev);
    }
  };
  const formatNumber = (num: number | undefined) => {
    const value = num ?? 0;
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + "M";
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + "K";
    }
    return value.toString();
  };
  const currentUserId = user?._id ?? "";
  const isLiked = tweetstate.likedBy?.includes(currentUserId);
  const isRetweet = tweetstate.retweetedBy?.includes(currentUserId);
  const rawAuthor = tweetstate.author;
  const author =
    typeof rawAuthor === "object" && rawAuthor !== null ? rawAuthor : undefined;
  const authorName = author?.displayName || "Unknown user";
  const authorUsername = author?.username || "unknown";
  const authorAvatar =
    author?.avatar ||
    "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400";
  return (
    <Card className="group/card bg-black border-gray-800 border-x-0 border-t-0 rounded-none transition-colors duration-150 hover:bg-gray-950/60 cursor-pointer">
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <Avatar className="h-12 w-12 ring-2 ring-transparent transition-shadow group-hover/card:ring-gray-800">
            <AvatarImage src={authorAvatar} alt={authorName} />
            <AvatarFallback>{authorName[0] || "?"}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-bold text-white">{authorName}</span>
              {author?.verified && (
                <div className="bg-blue-500 rounded-full p-0.5">
                  <svg
                    className="h-4 w-4 text-white fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  </svg>
                </div>
              )}
              <span className="text-gray-500">@{authorUsername}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500">
                {tweetstate.timestamp &&
                  new Date(tweetstate.timestamp).toLocaleDateString("en-us", {
                    month: "long",
                    year: "numeric",
                  })}
              </span>
              <div className="ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 rounded-full hover:bg-gray-900"
                >
                  <MoreHorizontal className="h-5 w-5 text-gray-500" />
                </Button>
              </div>
            </div>

            <div className="text-white mb-3 leading-relaxed">
              {tweetstate.content}
            </div>

            {tweetstate.image && (
              <div className="mb-3 rounded-2xl overflow-hidden">
                <img
                  src={tweetstate.image}
                  alt="Tweet image"
                  loading="lazy"
                  className="w-full h-auto max-h-96 object-cover"
                />
              </div>
            )}

            <div className="flex items-center justify-between max-w-md">
              <button
                className="group flex items-center gap-1.5 rounded-full p-2 text-gray-500 transition-all hover:bg-blue-900/20 hover:text-blue-400 active:scale-90"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">{formatNumber(tweetstate.comments)}</span>
              </button>

              <button
                className={`group flex items-center gap-1.5 rounded-full p-2 transition-all active:scale-90 ${
                  isRetweet
                    ? "text-green-400"
                    : "text-gray-500 hover:bg-green-900/20 hover:text-green-400"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  retweetTweet(tweetstate._id);
                }}
              >
                <Repeat2
                  className={`h-5 w-5 ${
                    isRetweet ? "fill-current" : ""
                  }`}
                />
                <span className="text-sm">{formatNumber(tweetstate.retweets)}</span>
              </button>

              <button
                className={`group flex items-center gap-1.5 rounded-full p-2 transition-all active:scale-90 ${
                  isLiked ? "text-red-500" : "text-gray-500 hover:bg-red-900/20 hover:text-red-400"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  likeTweet(tweetstate._id);
                }}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
                <span className="text-sm">{formatNumber(tweetstate.likes)}</span>
              </button>

              <button
                className={`group flex items-center gap-1.5 rounded-full p-2 transition-all active:scale-90 ${
                  bookmarked
                    ? "text-blue-500"
                    : "text-gray-500 hover:bg-blue-900/20 hover:text-blue-400"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(tweetstate._id);
                }}
              >
                <Bookmark
                  className={`h-5 w-5 ${bookmarked ? "fill-current" : ""}`}
                />
              </button>

              <button
                className="group flex items-center gap-1.5 rounded-full p-2 text-gray-500 transition-all hover:bg-blue-900/20 hover:text-blue-400 active:scale-90"
                onClick={(e) => {
                  e.stopPropagation();
                  const text = `${authorName}: "${tweetstate.content}"`;
                  if (navigator.share) {
                    navigator.share({ title: "Twiller", text }).catch(() => {});
                  } else {
                    navigator.clipboard?.writeText(text).catch(() => {});
                  }
                }}
              >
                <Share className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
