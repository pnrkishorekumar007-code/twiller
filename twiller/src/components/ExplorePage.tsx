"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, UserPlus, UserCheck, Loader2, SearchX } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import TweetCard, { type Tweet } from "./TweetCard";
import VerifiedBadge from "./VerifiedBadge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface SuggestedUser {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  verified?: boolean;
  followedBy?: string[];
}

type ExploreTab = "top" | "people";

export default function ExplorePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ExploreTab>("top");
  const [posts, setPosts] = useState<Tweet[]>([]);
  const [people, setPeople] = useState<SuggestedUser[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim();

  const fetchPosts = async (searchQuery: string) => {
    setLoadingPosts(true);
    try {
      const res = await axiosInstance.get("/post", {
        params: searchQuery ? { q: searchQuery } : undefined,
      });
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchPeople = async (searchQuery: string) => {
    setLoadingPeople(true);
    try {
      const res = searchQuery
        ? await axiosInstance.get("/users/search", { params: { q: searchQuery } })
        : await axiosInstance.get("/users", { params: { email: user?.email } });
      const users: SuggestedUser[] = Array.isArray(res.data) ? res.data : [];
      setPeople(users);
      setFollowing(
        new Set(
          users
            .filter((u) => u.followedBy?.includes(user?._id ?? ""))
            .map((u) => u._id)
        )
      );
    } catch {
      setPeople([]);
    } finally {
      setLoadingPeople(false);
    }
  };

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q) {
      setSearching(false);
      fetchPosts("");
      fetchPeople("");
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      fetchPosts(q);
      fetchPeople(q);
      setSearching(false);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, user?._id, user?.email]);

  const toggleFollow = async (id: string) => {
    if (!user) {
      toast("Log in to follow users", "error");
      return;
    }
    const wasFollowing = following.has(id);
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    try {
      await axiosInstance.post(`/follow/${id}`, { userId: user._id });
      toast(wasFollowing ? "Unfollowed" : "Following", "success");
    } catch {
      setFollowing((prev) => {
        const next = new Set(prev);
        if (wasFollowing) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
      toast("Failed to update follow. Try again.", "error");
    }
  };

  const renderUser = (u: SuggestedUser) => {
    const isFollowing = following.has(u._id);
    return (
      <div
        key={u._id}
        className="flex items-center justify-between gap-2 border-b border-gray-800 p-4 transition-colors hover:bg-gray-900/40"
      >
        <div className="flex min-w-0 items-center space-x-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarImage src={u.avatar || ""} alt={u.displayName} />
            <AvatarFallback>{u.displayName?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center space-x-1">
              <span className="truncate text-[15px] font-semibold text-white">
                {u.displayName}
              </span>
              {u.verified && <VerifiedBadge />}
            </div>
            <div className="truncate text-sm text-gray-400">@{u.username}</div>
            {u.bio && (
              <p className="mt-0.5 truncate text-sm text-gray-400">{u.bio}</p>
            )}
          </div>
        </div>
        <Button
          className={`h-8 shrink-0 rounded-full px-4 text-sm font-bold transition-all active:scale-95 ${
            isFollowing
              ? "border border-gray-600 bg-transparent text-white hover:bg-gray-800"
              : "bg-white text-black hover:bg-gray-200"
          }`}
          onClick={() => toggleFollow(u._id)}
        >
          {isFollowing ? (
            <span className="flex items-center gap-1">
              <UserCheck className="h-4 w-4" />
              Following
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              Follow
            </span>
          )}
        </Button>
      </div>
    );
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

  const emptyState = (label: string) => (
    <div className="flex flex-col items-center py-16 text-center">
      <SearchX className="mb-4 h-10 w-10 text-gray-700" />
      <p className="text-lg font-semibold text-gray-300">{label}</p>
      <p className="text-sm text-gray-500">
        Try searching for something else.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-black/90 backdrop-blur-md">
        <div className="px-4 pt-3">
          <h1 className="mb-3 text-xl font-bold text-white">Explore</h1>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              ref={inputRef}
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-full border-transparent bg-gray-900 py-3 pl-12 pr-11 text-white placeholder-gray-500 transition-colors focus:border-blue-500 focus:bg-black focus:ring-blue-500/30"
            />
            {q && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-white"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        <Tabs
          defaultValue="top"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ExploreTab)}
          className="mt-2 w-full"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border-b border-gray-800 bg-transparent">
            <TabsTrigger
              value="top"
              className="relative rounded-none py-4 font-semibold text-gray-400 data-[state=active]:bg-transparent data-[state=active]:text-white after:absolute after:inset-x-0 after:bottom-0 after:mx-auto after:h-1 after:w-16 after:rounded-full after:bg-blue-500 after:opacity-0 after:content-[''] data-[state=active]:after:opacity-100 hover:bg-gray-900/50"
            >
              Top
            </TabsTrigger>
            <TabsTrigger
              value="people"
              className="relative rounded-none py-4 font-semibold text-gray-400 data-[state=active]:bg-transparent data-[state=active]:text-white after:absolute after:inset-x-0 after:bottom-0 after:mx-auto after:h-1 after:w-16 after:rounded-full after:bg-blue-500 after:opacity-0 after:content-[''] data-[state=active]:after:opacity-100 hover:bg-gray-900/50"
            >
              People
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "top" ? (
        <div className="divide-y divide-gray-800">
          {loadingPosts ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : posts.length === 0 ? (
            emptyState(q ? `No posts found for "${q}"` : "No posts yet")
          ) : (
            posts.map((tweet) => <TweetCard key={tweet._id} tweet={tweet} />)
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {loadingPeople ? (
            <>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-gray-800 p-4"
                >
                  <div className="skeleton h-11 w-11 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-28 rounded-full" />
                    <div className="skeleton h-3 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </>
          ) : people.length === 0 ? (
            emptyState(q ? `No people found for "${q}"` : "No people yet")
          ) : (
            people.map(renderUser)
          )}
        </div>
      )}
    </div>
  );
}
