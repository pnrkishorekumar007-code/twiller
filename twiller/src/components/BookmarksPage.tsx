"use client";

import React, { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import TweetCard, { type Tweet } from "./TweetCard";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

export default function BookmarksPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchBookmarks = async () => {
      try {
        const res = await axiosInstance.get("/bookmarks", {
          params: { userId: user?._id },
        });
        if (!cancelled) setTweets(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setTweets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBookmarks();
    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  const handleUnbookmark = (tweetId: string, bookmarked: boolean) => {
    if (!bookmarked) {
      setTweets((prev) => prev.filter((t) => t._id !== tweetId));
    }
  };

  const SkeletonCard = () => (
    <div className="flex space-x-3 border-b border-gray-800 p-4">
      <div className="skeleton h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-3">
        <div className="flex space-x-2">
          <div className="skeleton h-4 w-32 rounded-full" />
          <div className="skeleton h-4 w-20 rounded-full" />
        </div>
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-4 w-1/2 rounded-full" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-black/90 px-4 py-3 backdrop-blur-md">
        <h1 className="text-xl font-bold text-white">{t("bookmarks.title")}</h1>
        <p className="text-sm text-gray-500">
          {t("bookmarks.savedTweets", { username: user?.username || "you" })}
        </p>
      </div>

      {loading ? (
        <div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : tweets.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-800">
            <Bookmark className="h-7 w-7 text-gray-500" />
          </div>
          <p className="mb-1 text-lg font-bold text-white">
            {t("bookmarks.emptyTitle")}
          </p>
          <p className="max-w-xs text-sm text-gray-500">
            {t("bookmarks.emptyDesc")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {tweets.map((tweet) => (
            <TweetCard
              key={tweet._id}
              tweet={{ ...tweet, bookmarked: true }}
              onBookmarkChange={handleUnbookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
