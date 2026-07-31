"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";

export function useNotificationsUnread(userId?: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await axiosInstance.get("/notifications/unread-count", {
          params: { userId },
        });
        if (!cancelled) setCount(res.data?.count ?? 0);
      } catch {
        // ignore
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId]);

  return count;
}
