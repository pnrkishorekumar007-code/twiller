"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import TweetCard from "./TweetCard";
import TweetComposer from "./TweetComposer";
import axiosInstance from "@/lib/axiosInstance";
import { Bird, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

interface Tweet {
  _id: string;
}

type FeedTab = "foryou" | "following";

const Feed = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<FeedTab>("foryou");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [followingTweets, setFollowingTweets] = useState<Tweet[]>([]);
  const [loading, setloading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const cacheRef = useRef<{ foryou: Tweet[] | null; following: Tweet[] | null }>({
    foryou: null,
    following: null,
  });

  const fetchTweets = useCallback(async () => {
    try {
      setloading(true);
      const res = await axiosInstance.get("/post");
      setTweets(res.data);
      cacheRef.current.foryou = res.data;
    } catch (error) {
      console.error(error);
    } finally {
      setloading(false);
    }
  }, []);

  const fetchFollowingTweets = useCallback(async () => {
    if (!user?._id) return;
    try {
      setFollowingLoading(true);
      const res = await axiosInstance.get("/post", {
        params: { following: true, userId: user._id },
      });
      setFollowingTweets(res.data);
      cacheRef.current.following = res.data;
    } catch (error) {
      console.error(error);
    } finally {
      setFollowingLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (cacheRef.current.foryou) {
      setTweets(cacheRef.current.foryou);
    } else {
      fetchTweets();
    }
  }, [fetchTweets]);

  useEffect(() => {
    if (activeTab !== "following") return;
    if (cacheRef.current.following) {
      setFollowingTweets(cacheRef.current.following);
    } else {
      fetchFollowingTweets();
    }
  }, [activeTab, fetchFollowingTweets]);

  const handlenewtweet = (newtweet: Tweet) => {
    setTweets((prev) => [newtweet, ...prev]);
    cacheRef.current.foryou = [newtweet, ...(cacheRef.current.foryou ?? [])];
  };

  const displayed = activeTab === "following" ? followingTweets : tweets;
  const displayedLoading =
    activeTab === "following" ? followingLoading : loading;

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
        <div className="skeleton h-44 w-full rounded-2xl" />
        <div className="flex justify-between pr-10">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-5 w-5 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-black/90 backdrop-blur-md">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-white">{t("feed.title")}</h1>
        </div>

        <Tabs
          defaultValue="foryou"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FeedTab)}
          className="w-full"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border-b border-gray-800 bg-transparent">
            <TabsTrigger
              value="foryou"
              className="relative rounded-none py-4 font-semibold text-gray-400 data-[state=active]:bg-transparent data-[state=active]:text-white after:absolute after:inset-x-0 after:bottom-0 after:mx-auto after:h-1 after:w-16 after:rounded-full after:bg-blue-500 after:opacity-0 after:content-[''] data-[state=active]:after:opacity-100 hover:bg-gray-900/50"
            >
              {t("feed.forYou")}
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="relative rounded-none py-4 font-semibold text-gray-400 data-[state=active]:bg-transparent data-[state=active]:text-white after:absolute after:inset-x-0 after:bottom-0 after:mx-auto after:h-1 after:w-16 after:rounded-full after:bg-blue-500 after:opacity-0 after:content-[''] data-[state=active]:after:opacity-100 hover:bg-gray-900/50"
            >
              {t("feed.following")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <TweetComposer onTweetPosted={handlenewtweet} />
      <div className="divide-y divide-gray-800">
        {displayedLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : displayed.length === 0 ? (
          activeTab === "following" ? (
            <div className="flex flex-col items-center py-16 text-center">
              <UserPlus className="mb-4 h-10 w-10 text-gray-700" />
              <p className="text-lg font-semibold text-gray-300">
                {t("feed.emptyFollowingTitle")}
              </p>
              <p className="text-sm text-gray-500">
                {t("feed.emptyFollowingDesc")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <Bird className="mb-4 h-10 w-10 text-gray-700" />
              <p className="text-lg font-semibold text-gray-300">
                {t("feed.emptyTitle")}
              </p>
              <p className="text-sm text-gray-500">
                {t("feed.emptyDesc")}
              </p>
            </div>
          )
        ) : (
          displayed.map((tweet) => (
            <TweetCard key={tweet._id} tweet={tweet} />
          ))
        )}
      </div>
    </div>
  );
};

export default Feed;
