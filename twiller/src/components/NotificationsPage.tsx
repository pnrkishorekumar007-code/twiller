"use client";

import React, { useEffect, useState } from "react";
import { Bell, Heart, Repeat2, UserPlus, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface NotificationActor {
  _id: string;
  displayName: string;
  username: string;
  avatar?: string;
}

interface NotificationItem {
  _id: string;
  recipient: string;
  actor: NotificationActor;
  type: "like" | "retweet" | "follow";
  tweet?: {
    _id: string;
    content?: string;
    image?: string;
    timestamp?: string;
  } | null;
  read: boolean;
  timestamp: string;
}

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString("en-us", {
    month: "short",
    day: "numeric",
  });
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchNotifications = async () => {
      try {
        const res = await axiosInstance.get("/notifications", {
          params: { userId: user?._id },
        });
        if (cancelled) return;
        const items: NotificationItem[] = Array.isArray(res.data)
          ? res.data
          : [];
        setNotifications(items);
        if (items.some((n) => !n.read)) {
          axiosInstance
            .post("/notifications/read", { userId: user?._id })
            .catch(() => {});
        }
      } catch {
        if (!cancelled) setNotifications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchNotifications();
    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  const markAllRead = async () => {
    try {
      await axiosInstance.post("/notifications/read", { userId: user?._id });
      toast("All notifications marked as read", "success");
    } catch {
      toast("Failed to mark notifications as read", "error");
    }
  };

  const iconFor = (type: NotificationItem["type"]) => {
    if (type === "like") {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <Heart className="h-4 w-4 fill-current" />
        </div>
      );
    }
    if (type === "retweet") {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-500">
          <Repeat2 className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
        <UserPlus className="h-4 w-4" />
      </div>
    );
  };

  const SkeletonRow = () => (
    <div className="flex items-center gap-3 border-b border-gray-800 p-4">
      <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-2/3 rounded-full" />
        <div className="skeleton h-3 w-1/3 rounded-full" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-black/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Notifications</h1>
          {notifications.length > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 rounded-full p-2 text-sm font-semibold text-blue-400 transition-colors hover:bg-blue-900/20"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500">@{user?.username}</p>
      </div>

      {loading ? (
        <div>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-800">
            <Bell className="h-7 w-7 text-gray-500" />
          </div>
          <p className="mb-1 text-lg font-bold text-white">
            Nothing to see here yet
          </p>
          <p className="max-w-xs text-sm text-gray-500">
            Likes, retweets and follows on your tweets will show up here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {notifications.map((n) => (
            <div
              key={n._id}
              className="flex items-start gap-3 p-4 transition-colors hover:bg-gray-900/40"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={n.actor.avatar || ""} alt={n.actor.displayName} />
                <AvatarFallback>{n.actor.displayName?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-bold text-white">
                    {n.actor.displayName}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">
                    {timeAgo(n.timestamp)}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  @{n.actor.username}
                  {n.type === "follow"
                    ? " followed you"
                    : n.type === "like"
                    ? " liked your tweet"
                    : " retweeted your tweet"}
                </div>
                {n.tweet?.content && (
                  <p className="mt-1 truncate text-sm text-gray-500">
                    &quot;{n.tweet.content}&quot;
                  </p>
                )}
              </div>
              {iconFor(n.type)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
