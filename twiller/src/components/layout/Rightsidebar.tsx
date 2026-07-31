"use client";

import { Search, Crown, Sparkles, UserPlus, UserCheck } from "lucide-react";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import axiosInstance from "@/lib/axiosInstance";

interface SuggestedUser {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  verified?: boolean;
}

const FALLBACK_SUGGESTIONS: SuggestedUser[] = [
  {
    _id: "1",
    username: "narendramodi",
    displayName: "Narendra Modi",
    avatar: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400",
    verified: true,
  },
  {
    _id: "2",
    username: "akshaykumar",
    displayName: "Akshay Kumar",
    avatar: "https://images.pexels.com/photos/1382735/pexels-photo-1382735.jpeg?auto=compress&cs=tinysrgb&w=400",
    verified: true,
  },
  {
    _id: "3",
    username: "rashtrapatibhvn",
    displayName: "President of India",
    avatar: "https://images.pexels.com/photos/1080213/pexels-photo-1080213.jpeg?auto=compress&cs=tinysrgb&w=400",
    verified: true,
  },
];

export default function RightSidebar() {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const fetchUsers = async () => {
      try {
        const res = await axiosInstance.get("/users");
        if (cancelled) return;
        const users = Array.isArray(res.data) ? res.data : [];
        setSuggestions(users.length > 0 ? users : FALLBACK_SUGGESTIONS);
      } catch {
        if (!cancelled) setSuggestions(FALLBACK_SUGGESTIONS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFollow = (id: string) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="sticky top-0 h-screen w-80 space-y-4 overflow-y-auto p-4">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search"
            className="rounded-full border-transparent bg-gray-900 py-3 pl-12 text-white placeholder-gray-500 transition-colors focus:border-blue-500 focus:bg-black focus:ring-blue-500/30"
          />
        </div>

        <Card className="overflow-hidden rounded-2xl border-gray-800 bg-gray-900/80">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-bold text-white">
                Subscribe to Premium
              </h3>
            </div>
            <p className="mb-4 text-sm text-gray-400">
              Subscribe to unlock new features and get more tweets every month.
            </p>
            <Link href="/pricing">
              <Button className="w-full rounded-full bg-blue-500 py-2.5 font-semibold text-white transition-all hover:bg-blue-600 active:scale-[0.98]">
                <Sparkles className="h-4 w-4" />
                Upgrade
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl border-gray-800 bg-gray-900/80">
        <CardContent className="p-4">
          <h3 className="mb-4 text-lg font-bold text-white">You might like</h3>
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-28 rounded-full" />
                    <div className="skeleton h-3 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="space-y-4">
            {suggestions.map((user) => {
              const isFollowing = following.has(user._id);
              return (
                <div
                  key={user._id}
                  className="flex items-center justify-between gap-2 rounded-xl p-1 transition-colors hover:bg-gray-800/60"
                >
                  <div className="flex min-w-0 items-center space-x-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage
                        src={user.avatar || ""}
                        alt={user.displayName}
                      />
                      <AvatarFallback>
                        {user.displayName?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1">
                        <span className="truncate text-[15px] font-semibold text-white">
                          {user.displayName}
                        </span>
                        {user.verified && (
                          <div className="rounded-full bg-blue-500 p-0.5">
                            <svg
                              className="h-3 w-3 fill-current text-white"
                              viewBox="0 0 20 20"
                            >
                              <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="truncate text-sm text-gray-400">
                        @{user.username}
                      </div>
                    </div>
                  </div>
                  <Button
                    className={`h-8 shrink-0 rounded-full px-4 text-sm font-bold transition-all active:scale-95 ${
                      isFollowing
                        ? "border border-gray-600 bg-transparent text-white hover:bg-gray-800"
                        : "bg-white text-black hover:bg-gray-200"
                    }`}
                    onClick={() => toggleFollow(user._id)}
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
            })}
          </div>
          )}
          <button className="mt-4 p-0 text-blue-400 transition-colors hover:text-blue-300">
            Show more
          </button>
        </CardContent>
      </Card>

      <div className="space-y-2 p-4 text-xs text-gray-500">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <a href="#" className="hover:underline">
            Terms of Service
          </a>
          <a href="#" className="hover:underline">
            Privacy Policy
          </a>
          <a href="#" className="hover:underline">
            Cookie Policy
          </a>
          <a href="#" className="hover:underline">
            Accessibility
          </a>
          <a href="#" className="hover:underline">
            Ads info
          </a>
        </div>
        <div>© {new Date().getFullYear()} Twiller.</div>
      </div>
    </div>
  );
}
