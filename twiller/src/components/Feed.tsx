"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import TweetCard from "./TweetCard";
import TweetComposer from "./TweetComposer";
import axiosInstance from "@/lib/axiosInstance";
import { Bird } from "lucide-react";

interface Tweet {
  _id: string;
}

const Feed = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setloading] = useState(false);
  const fetchTweets = async () => {
    try {
      setloading(true);
      const res = await axiosInstance.get("/post");
      setTweets(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setloading(false);
    }
  };
  useEffect(() => {
    fetchTweets();
  }, []);
  const handlenewtweet = (newtweet: Tweet) => {
    setTweets((prev) => [newtweet, ...prev]);
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
          <h1 className="text-xl font-bold text-white">Home</h1>
        </div>

        <Tabs defaultValue="foryou" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border-b border-gray-800 bg-transparent">
            <TabsTrigger
              value="foryou"
              className="relative rounded-none py-4 font-semibold text-gray-400 data-[state=active]:bg-transparent data-[state=active]:text-white after:absolute after:inset-x-0 after:bottom-0 after:mx-auto after:h-1 after:w-16 after:rounded-full after:bg-blue-500 after:opacity-0 after:content-[''] data-[state=active]:after:opacity-100 hover:bg-gray-900/50"
            >
              For you
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="relative rounded-none py-4 font-semibold text-gray-400 data-[state=active]:bg-transparent data-[state=active]:text-white after:absolute after:inset-x-0 after:bottom-0 after:mx-auto after:h-1 after:w-16 after:rounded-full after:bg-blue-500 after:opacity-0 after:content-[''] data-[state=active]:after:opacity-100 hover:bg-gray-900/50"
            >
              Following
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <TweetComposer onTweetPosted={handlenewtweet} />
      <div className="divide-y divide-gray-800">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : tweets.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Bird className="mb-4 h-10 w-10 text-gray-700" />
            <p className="text-lg font-semibold text-gray-300">
              No tweets yet
            </p>
            <p className="text-sm text-gray-500">
              Be the first to post what&apos;s happening.
            </p>
          </div>
        ) : (
          tweets.map((tweet) => (
            <TweetCard key={tweet._id} tweet={tweet} />
          ))
        )}
      </div>
    </div>
  );
};

export default Feed;
