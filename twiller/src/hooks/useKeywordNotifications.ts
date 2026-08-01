"use client";
import { useEffect, useRef } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";

const KEYWORDS = ["cricket", "science"];
const POLL_INTERVAL_MS = 20000;

export function useKeywordNotifications() {
  const { user } = useAuth();
  const lastSeenIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user?.notificationsEnabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const poll = async () => {
      try {
        const res = await axiosInstance.get("/post");
        const tweets = res.data as Array<{
          _id: string;
          content: string;
          author?: { displayName?: string };
        }>;

        if (!initializedRef.current) {
          lastSeenIdRef.current = tweets[0]?._id ?? null;
          initializedRef.current = true;
          return;
        }

        const lastSeenIndex = tweets.findIndex(
          (t) => t._id === lastSeenIdRef.current
        );
        const newTweets =
          lastSeenIndex === -1 ? tweets : tweets.slice(0, lastSeenIndex);

        for (const tweet of newTweets.reverse()) {
          const lower = tweet.content?.toLowerCase() || "";
          if (KEYWORDS.some((kw) => lower.includes(kw))) {
            new Notification(
              `New tweet from ${tweet.author?.displayName || "someone"}`,
              {
                body: tweet.content,
              }
            );
          }
        }

        if (tweets[0]) lastSeenIdRef.current = tweets[0]._id;
      } catch (err) {
        console.error("Keyword notification poll failed:", err);
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user?.notificationsEnabled]);
}
