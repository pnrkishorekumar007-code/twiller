"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Link as LinkIcon,
  MoreHorizontal,
  Camera,
  Crown,
  Monitor,
  Smartphone,
  Tablet,
  Bell,
  Languages,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useNav } from "@/context/NavContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import TweetCard, { type Tweet } from "./TweetCard";
import { Card, CardContent } from "./ui/card";
import Editprofile from "./Editprofile";
import LanguageOtpModal from "./LanguageOtpModal";
import axiosInstance from "@/lib/axiosInstance";
import { timeAgo } from "@/lib/time";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";

interface LoginHistoryEntry {
  _id: string;
  browser: string;
  browserVersion: string;
  os: string;
  device: "desktop" | "mobile" | "tablet";
  ip: string;
  otpVerified: boolean;
  timestamp: string;
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { goBack } = useNav();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setloading] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);

  const fetchTweets = async () => {
    if (!user) return;
    try {
      setloading(true);
      const res = await axiosInstance.get(`/post/user/${user._id}`);
      setTweets(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setloading(false);
    }
  };
  const fetchLoginHistory = async () => {
    try {
      const res = await axiosInstance.get("/auth/login-history");
      setLoginHistory(res.data);
    } catch (error) {
      console.error("Failed to fetch login history:", error);
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!user) return;
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
      const updatedUser = { ...user, notificationsEnabled: enabled };
      setUser(updatedUser);
      localStorage.setItem("twitter-user", JSON.stringify(updatedUser));
      toast(
        enabled
          ? t("profile.notificationEnabled")
          : t("profile.notificationDisabled"),
        "success"
      );
    } catch (error) {
      console.error("Failed to update notification preference:", error);
      toast(t("profile.notificationToggleFailed"), "error");
    }
  };

  const handleLanguageChange = (code: string) => {
    if (!user) return;
    if (code === i18n.language) return;
    // The server picks the channel: SMS (Firebase Phone Auth) when the account
    // has a phone, otherwise a Resend email OTP. No phone is required here.
    setPendingLanguage(code);
    setShowLanguageModal(true);
  };

  useEffect(() => {
    if (user) {
      fetchTweets();
      fetchLoginHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  if (!user) return null;

  const userTweets = tweets;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="flex items-center px-4 py-3 space-x-8">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2 transition-colors hover:bg-gray-900"
            onClick={goBack}
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{user.displayName}</h1>
            <p className="text-sm text-gray-400">
              {t("profile.posts", { count: userTweets.length })}
            </p>
          </div>
        </div>
      </div>

      {/* Cover Photo */}
      <div className="relative">
        <div className="relative h-48 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600">
          <div className="absolute inset-0 bg-black/20" />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70"
            onClick={() => setShowEditModal(true)}
            title={t("profile.editCover")}
          >
            <Camera className="h-5 w-5 text-white" />
          </Button>
        </div>

        {/* Profile Picture */}
        <div className="absolute -bottom-16 left-4">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-black">
              <AvatarImage src={user.avatar} alt={user.displayName} />
              <AvatarFallback className="bg-blue-600 text-2xl">
                {user.displayName?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-2 right-2 rounded-full bg-black/70 p-2 transition-colors hover:bg-black/90"
              onClick={() => setShowEditModal(true)}
              title={t("profile.editPhoto")}
            >
              <Camera className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>

        {/* Edit Profile Button */}
        <div className="flex justify-end p-4">
          <Button
            variant="outline"
            className="rounded-full border-gray-600 bg-gray-950 px-6 font-semibold text-white transition-all hover:bg-gray-900 active:scale-[0.98]"
            onClick={() => setShowEditModal(true)}
          >
            {t("profile.edit")}
          </Button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-12 px-4 pb-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {user.displayName}
            </h1>
            <p className="text-gray-400">@{user.username}</p>
          </div>
          <div className="flex items-center space-x-2">
            {user.plan && user.plan !== "free" && (
              <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 px-3 py-1 text-xs font-semibold text-yellow-400 ring-1 ring-yellow-500/30">
                <Crown className="h-3.5 w-3.5" />
                {t(`pricing.plans.${user.plan}.name`)}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full p-2 transition-colors hover:bg-gray-900"
            >
              <MoreHorizontal className="h-5 w-5 text-gray-400" />
            </Button>
          </div>
        </div>

        {user.bio && (
          <p className="text-white mb-3 leading-relaxed">{user.bio}</p>
        )}

        <div className="mb-3 flex items-center space-x-4 text-sm">
          <span className="text-white">
            <span className="font-bold">
              {user.following?.length ?? 0}
            </span>{" "}
            <span className="text-gray-400">{t("profile.following")}</span>
          </span>
          <span className="text-white">
            <span className="font-bold">
              {user.followedBy?.length ?? 0}
            </span>{" "}
            <span className="text-gray-400">{t("profile.followers")}</span>
          </span>
        </div>

        <div className="flex items-center space-x-4 text-gray-400 text-sm mb-3">
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            <span>{user.location || t("profile.locationDefault")}</span>
          </div>
          <div className="flex items-center space-x-1">
            <LinkIcon className="h-4 w-4" />
            <span className="text-blue-400">
              {user.website || t("profile.websiteDefault")}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>
              {t("profile.joined", {
                date: user.joinedDate
                  ? new Date(user.joinedDate).toLocaleDateString(i18n.language, {
                      month: "long",
                      year: "numeric",
                    })
                  : "",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Keyword Notifications */}
      <div className="px-4 pb-6">
        <Card className="bg-black border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start space-x-3">
                <Bell className="mt-0.5 h-5 w-5 text-blue-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">
                    {t("profile.notificationTitle")}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {t("profile.notificationDesc")}
                  </p>
                  {user.notificationsEnabled &&
                    !("Notification" in window) &&
                    typeof window !== "undefined" && (
                      <p className="mt-1 text-xs text-yellow-400">
                        {t("profile.notificationUnsupported")}
                      </p>
                    )}
                  {user.notificationsEnabled &&
                    "Notification" in window &&
                    Notification.permission !== "granted" && (
                      <p className="mt-1 text-xs text-yellow-400">
                        {t("profile.notificationBlocked")}
                      </p>
                    )}
                </div>
              </div>
              <button
                role="switch"
                aria-checked={!!user.notificationsEnabled}
                onClick={() =>
                  handleNotificationToggle(!user.notificationsEnabled)
                }
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  user.notificationsEnabled
                    ? "bg-blue-500"
                    : "bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    user.notificationsEnabled
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Language */}
      <div className="px-4 pb-6">
        <Card className="bg-black border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start space-x-3">
                <Languages className="mt-0.5 h-5 w-5 text-blue-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">
                    {t("language.title")}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {t("language.subtitle")}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label
                htmlFor="language-select"
                className="mb-1 block text-xs font-medium text-gray-400"
              >
                {t("language.switchLabel")}
              </label>
              <select
                id="language-select"
                value={i18n.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Login History */}
      {loginHistory.length > 0 && (
        <div className="px-4 pb-6">
          <h2 className="mb-2 text-lg font-bold text-white">
            {t("profile.loginHistory")}
          </h2>
          <Card className="bg-black border-gray-800">
            <CardContent className="p-0 divide-y divide-gray-800">
              {loginHistory.map((entry) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center space-x-3">
                    {entry.device === "mobile" ? (
                      <Smartphone className="h-5 w-5 text-gray-400 shrink-0" />
                    ) : entry.device === "tablet" ? (
                      <Tablet className="h-5 w-5 text-gray-400 shrink-0" />
                    ) : (
                      <Monitor className="h-5 w-5 text-gray-400 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">
                        {entry.browser}
                        {entry.browserVersion
                          ? ` ${entry.browserVersion}`
                          : ""}
                        <span className="text-gray-500"> · </span>
                        {entry.os}
                      </p>
                      <p className="text-xs text-gray-400">{entry.ip}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {timeAgo(entry.timestamp)}
                    </p>
                    {entry.otpVerified && (
                      <p className="text-xs text-green-400">
                        {t("profile.otpVerified")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-transparent border-b border-gray-800 rounded-none h-auto">
          <TabsTrigger
            value="posts"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            {t("profile.tabPosts")}
          </TabsTrigger>
          <TabsTrigger
            value="replies"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            {t("profile.tabReplies")}
          </TabsTrigger>
          <TabsTrigger
            value="highlights"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            {t("profile.tabHighlights")}
          </TabsTrigger>
          <TabsTrigger
            value="articles"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            {t("profile.tabArticles")}
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            {t("profile.tabMedia")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          <div className="divide-y divide-gray-800">
            {loading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex space-x-3 p-4">
                    <div className="skeleton h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-3">
                      <div className="skeleton h-4 w-32 rounded-full" />
                      <div className="skeleton h-4 w-3/4 rounded-full" />
                      <div className="skeleton h-4 w-1/2 rounded-full" />
                      <div className="flex justify-between pr-10">
                        {[0, 1, 2, 3].map((j) => (
                          <div key={j} className="skeleton h-5 w-5 rounded-full" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : userTweets.length === 0 ? (
              <Card className="bg-black border-none">
                <CardContent className="py-12 text-center">
                  <div className="text-gray-400">
                    <h3 className="text-2xl font-bold mb-2">
                      {t("profile.emptyPostsTitle")}
                    </h3>
                    <p>{t("profile.emptyPostsDesc")}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              userTweets.map((tweet) => (
                <TweetCard key={tweet._id} tweet={tweet} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="replies" className="mt-0">
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  {t("profile.emptyRepliesTitle")}
                </h3>
                <p>{t("profile.emptyRepliesDesc")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highlights" className="mt-0">
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  {t("profile.emptyHighlightsTitle")}
                </h3>
                <p>{t("profile.emptyHighlightsDesc")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="articles" className="mt-0">
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  {t("profile.emptyArticlesTitle")}
                </h3>
                <p>{t("profile.emptyArticlesDesc")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="mt-0">
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  {t("profile.emptyMediaTitle")}
                </h3>
                <p>{t("profile.emptyMediaDesc")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Editprofile
        isopen={showEditModal}
        onclose={() => setShowEditModal(false)}
      />
      {showLanguageModal && pendingLanguage && (
        <LanguageOtpModal
          targetLanguage={pendingLanguage}
          onClose={() => setShowLanguageModal(false)}
        />
      )}
    </div>
  );
}
