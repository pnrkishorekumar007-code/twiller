"use client";

import {
  Search,
  Crown,
  Sparkles,
  UserPlus,
  UserCheck,
  Loader2,
  TrendingUp,
  Bell,
  Settings,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import VerifiedBadge from "../VerifiedBadge";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import { useNav } from "@/context/NavContext";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";
import { timeAgo } from "@/lib/time";

interface SuggestedUser {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  verified?: boolean;
  followedBy?: string[];
}

interface LoginEntry {
  _id: string;
  timestamp: string;
}

export default function RightSidebar() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const { openProfile, search, openPage } = useNav();
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [trends, setTrends] = useState<{ tag: string; count: number }[]>([]);
  const [logins, setLogins] = useState<LoginEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/auth/login-history")
      .then((res) => {
        if (!cancelled) {
          setLogins(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/trends")
      .then((res) => {
        if (!cancelled) setTrends(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SuggestedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchUsers = async () => {
      try {
        const res = await axiosInstance.get("/users", {
          params: { email: user?.email },
        });
        if (cancelled) return;
        const users = Array.isArray(res.data) ? res.data : [];
        setSuggestions(users);
        setFollowing(
          new Set(
            users
              .filter((u: SuggestedUser) =>
                u.followedBy?.includes(user?._id ?? "")
              )
              .map((u: SuggestedUser) => u._id)
          )
        );
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [user?._id, user?.email]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await axiosInstance.get("/users/search", {
          params: { q },
        });
        setSearchResults(Array.isArray(res.data) ? res.data : []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  const isFollowingUser = (id: string) => following.has(id);

  const toggleFollow = async (id: string) => {
    if (!user) {
      toast(t("follow.loginRequired"), "error");
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
      toast(wasFollowing ? t("follow.unfollowed") : t("follow.following"), "success");
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
      toast(t("follow.failed"), "error");
    }
  };

  const renderUser = (u: SuggestedUser) => {
    const isFollowing = isFollowingUser(u._id);
    return (
      <div
        key={u._id}
        className="flex items-center justify-between gap-2 rounded-xl p-1 transition-colors hover:bg-gray-800/60"
      >
        <div className="flex min-w-0 items-center space-x-3">
          <button
            onClick={() => openProfile(u._id)}
            className="shrink-0 rounded-full focus:outline-none"
            aria-label={t("follow.viewProfile", { name: u.displayName })}
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={u.avatar || ""} alt={u.displayName} />
              <AvatarFallback>{u.displayName?.[0] || "?"}</AvatarFallback>
            </Avatar>
          </button>
          <div className="min-w-0">
            <button
              onClick={() => openProfile(u._id)}
              className="flex items-center space-x-1 rounded-full focus:outline-none"
            >
              <span className="truncate text-[15px] font-semibold text-white transition-colors hover:underline">
                {u.displayName}
              </span>
              {u.verified && <VerifiedBadge />}
            </button>
            <div className="truncate text-sm text-gray-400">@{u.username}</div>
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
              {t("follow.following")}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              {t("follow.follow")}
            </span>
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className="sticky top-0 h-screen w-80 space-y-4 overflow-y-auto p-4">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t("search.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            className="rounded-full border-transparent bg-gray-900 py-3 pl-12 text-white placeholder-gray-500 transition-colors focus:border-blue-500 focus:bg-black focus:ring-blue-500/30"
          />
          {query.trim() && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : (
                <button
                  className="rounded-full p-0.5 text-gray-400 hover:text-white"
                  onClick={() => setQuery("")}
                  aria-label={t("search.clear")}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
          {searchOpen && query.trim() && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl shadow-black/60">
              <div className="max-h-80 space-y-1 overflow-y-auto p-2">
                {searchResults.length === 0 && !searching ? (
                  <p className="p-4 text-center text-sm text-gray-400">
                    {t("search.noResults")}
                  </p>
                ) : (
                  searchResults.map((u) =>
                    u._id === user?._id ? null : renderUser(u)
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <Card className="overflow-hidden rounded-2xl border-gray-800 bg-gray-900/80">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-bold text-white">
                {t("premium.subscribeTitle")}
              </h3>
            </div>
            <p className="mb-4 text-sm text-gray-400">
              {t("premium.subscribeDesc")}
            </p>
            <Link href="/pricing">
              <Button className="w-full rounded-full bg-blue-500 py-2.5 font-semibold text-white transition-all hover:bg-blue-600 active:scale-[0.98]">
                <Sparkles className="h-4 w-4" />
                {t("premium.upgrade")}
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-2xl border-gray-800 bg-gray-900/80">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">
                {t("notifications.title")}
              </h3>
            </div>
            <p className="mb-4 text-sm text-gray-400">
              {t("notifications.subtitle")}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">
                {t("notifications.follow")}
              </span>
              <button
                role="switch"
                aria-checked={!!user?.notificationsEnabled}
                onClick={async () => {
                  if (!user) return;
                  const enabled = !user.notificationsEnabled;
                  if (enabled) {
                    if (!("Notification" in window)) {
                      toast(t("profile.notificationUnsupported"), "error");
                      return;
                    }
                    const permission = await Notification.requestPermission();
                    if (permission !== "granted") {
                      toast(t("profile.notificationBlocked"), "error");
                      return;
                    }
                  }
                  try {
                    await axiosInstance.patch(`/userdata/${user.email}`, {
                      notificationsEnabled: enabled,
                    });
                    const updatedUser = {
                      ...user,
                      notificationsEnabled: enabled,
                    };
                    setUser(updatedUser);
                    localStorage.setItem(
                      "twitter-user",
                      JSON.stringify(updatedUser)
                    );
                    toast(
                      enabled
                        ? t("profile.notificationEnabled")
                        : t("profile.notificationDisabled"),
                      "success"
                    );
                  } catch {
                    toast(t("profile.notificationToggleFailed"), "error");
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  user?.notificationsEnabled
                    ? "bg-blue-500"
                    : "bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    user?.notificationsEnabled
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-gray-800 bg-gray-900/80">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-400" />
              <h3 className="text-lg font-bold text-white">
                {t("security.title")}
              </h3>
            </div>
            <p className="mb-4 text-sm text-gray-400">{t("security.desc")}</p>
            <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-950 p-3">
              <div>
                <p className="text-xs text-gray-500">{t("security.lastLogin")}</p>
                <p className="text-sm font-semibold text-white">
                  {logins.length > 0
                    ? timeAgo(logins[0].timestamp)
                    : t("security.noData")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {t("security.sessions")}
                </p>
                <p className="text-sm font-semibold text-white">
                  {logins.length}
                </p>
              </div>
            </div>
            <button
              onClick={() => openPage("login-activity")}
              className="flex w-full items-center justify-center gap-1 rounded-full border border-gray-700 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-900"
            >
              {t("security.view")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      </div>

      {trends.length > 0 && (
        <Card className="overflow-hidden rounded-2xl border-gray-800 bg-gray-900/80">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">{t("trends.forYou")}</h3>
            </div>
            <div>
              {trends.map((trend, i) => (
                <button
                  key={trend.tag}
                  onClick={() => search(trend.tag)}
                  className="flex w-full items-center justify-between rounded-xl p-2 text-left transition-colors hover:bg-gray-800/60"
                >
                  <div>
                    <div className="text-xs text-gray-500">
                      {t("trends.trending", { n: i + 1 })}
                    </div>
                    <div className="font-semibold text-white">{trend.tag}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {t("trends.posts", { count: trend.count })}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden rounded-2xl border-gray-800 bg-gray-900/80">
        <CardContent className="p-4">
          <h3 className="mb-4 text-lg font-bold text-white">{t("suggestions.title")}</h3>
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
            suggestions.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                {t("suggestions.empty")}
              </p>
            ) : (
              <div className="space-y-4">{suggestions.map(renderUser)}</div>
            )
          )}
        </CardContent>
      </Card>

      <div className="space-y-2 p-4 text-xs text-gray-500">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <a href="#" className="hover:underline">
            {t("footer.terms")}
          </a>
          <a href="#" className="hover:underline">
            {t("footer.privacy")}
          </a>
          <a href="#" className="hover:underline">
            {t("footer.cookies")}
          </a>
          <a href="#" className="hover:underline">
            {t("footer.accessibility")}
          </a>
          <a href="#" className="hover:underline">
            {t("footer.adsInfo")}
          </a>
        </div>
        <div>{t("common.copyright", { year: new Date().getFullYear() })}</div>
      </div>
    </div>
  );
}
