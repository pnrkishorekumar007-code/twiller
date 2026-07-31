"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Crown,
  UserPlus,
  UserCheck,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNav } from "@/context/NavContext";
import { useToast } from "@/context/ToastContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import TweetCard, { type Tweet } from "./TweetCard";
import axiosInstance from "@/lib/axiosInstance";
import { PLAN_LABELS } from "@/lib/plans";
import VerifiedBadge from "./VerifiedBadge";

interface ProfileUser {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  location?: string;
  website?: string;
  joinedDate?: string;
  plan?: string;
  tweetCount?: number;
  following: string[];
  followedBy: string[];
}

export default function UserProfilePage({ userId }: { userId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { goBack } = useNav();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const [userRes, tweetRes] = await Promise.all([
          axiosInstance.get(`/user/${userId}`),
          axiosInstance.get(`/post/user/${userId}`),
        ]);
        if (cancelled) return;
        const data: ProfileUser = userRes.data;
        setProfile(data);
        setTweets(Array.isArray(tweetRes.data) ? tweetRes.data : []);
        setFollowing(!!data.followedBy?.includes(user?._id ?? ""));
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [userId, user?._id]);

  const toggleFollow = async () => {
    if (!user || !profile) return;
    setFollowBusy(true);
    const wasFollowing = following;
    setFollowing((prev) => !prev);
    try {
      await axiosInstance.post(`/follow/${profile._id}`, { userId: user._id });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followedBy: wasFollowing
                ? prev.followedBy.filter((id) => id !== user._id)
                : [...prev.followedBy, user._id],
            }
          : prev
      );
      toast(wasFollowing ? "Unfollowed" : "Following", "success");
    } catch {
      setFollowing(wasFollowing);
      toast("Failed to update follow. Try again.", "error");
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-8 text-center">
        <p className="text-lg font-semibold text-gray-300">User not found</p>
        <p className="text-sm text-gray-500">
          This profile may have been removed.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-black/90 backdrop-blur-md">
        <div className="flex items-center space-x-8 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2 transition-colors hover:bg-gray-900"
            onClick={goBack}
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">
              {profile.displayName}
            </h1>
            <p className="text-sm text-gray-400">{tweets.length} posts</p>
          </div>
        </div>
      </div>

      <div className="relative h-48 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute -bottom-16 left-4">
          <Avatar className="h-32 w-32 border-4 border-black">
            <AvatarImage src={profile.avatar} alt={profile.displayName} />
            <AvatarFallback className="bg-blue-600 text-2xl">
              {profile.displayName?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="flex justify-end p-4">
        <Button
          disabled={followBusy}
          onClick={toggleFollow}
          className={`rounded-full px-6 font-semibold transition-all active:scale-95 ${
            following
              ? "border border-gray-600 bg-transparent text-white hover:bg-gray-800"
              : "bg-white text-black hover:bg-gray-200"
          }`}
        >
          {following ? (
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

      <div className="mt-12 px-4 pb-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                {profile.displayName}
              </h1>
              {profile.plan && profile.plan !== "free" && <VerifiedBadge />}
            </div>
            <p className="text-gray-400">@{profile.username}</p>
          </div>
          {profile.plan && profile.plan !== "free" && (
            <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 px-3 py-1 text-xs font-semibold text-yellow-400 ring-1 ring-yellow-500/30">
              <Crown className="h-3.5 w-3.5" />
              {PLAN_LABELS[profile.plan] ?? profile.plan}
            </span>
          )}
        </div>

        {profile.bio && (
          <p className="mb-3 leading-relaxed text-white">{profile.bio}</p>
        )}

        <div className="mb-3 flex items-center space-x-4 text-sm">
          <span className="text-white">
            <span className="font-bold">{profile.following?.length ?? 0}</span>{" "}
            <span className="text-gray-400">Following</span>
          </span>
          <span className="text-white">
            <span className="font-bold">{profile.followedBy?.length ?? 0}</span>{" "}
            <span className="text-gray-400">Followers</span>
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-center space-x-4 text-sm text-gray-400">
          {profile.location && (
            <div className="flex items-center space-x-1">
              <MapPin className="h-4 w-4" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.website && (
            <div className="flex items-center space-x-1">
              <LinkIcon className="h-4 w-4" />
              <span className="text-blue-400">{profile.website}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>
              Joined{" "}
              {profile.joinedDate &&
                new Date(profile.joinedDate).toLocaleDateString("en-us", {
                  month: "long",
                  year: "numeric",
                })}
            </span>
          </div>
        </div>
      </div>

      <div className="border-y border-gray-800">
        <div className="border-b-2 border-blue-500 px-4 py-4 text-center font-semibold text-white">
          Posts
        </div>
      </div>

      <div className="divide-y divide-gray-800">
        {tweets.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">
            @{profile.username} hasn&apos;t posted yet
          </p>
        ) : (
          tweets.map((tweet) => <TweetCard key={tweet._id} tweet={tweet} />)
        )}
      </div>
    </div>
  );
}
