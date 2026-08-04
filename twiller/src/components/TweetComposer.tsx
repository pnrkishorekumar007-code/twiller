"use client";

import { useAuth } from "@/context/AuthContext";
import React, { useState, type FormEvent } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Image as LucideImage, BarChart3, Smile, Calendar, MapPin, Globe, X } from "lucide-react";
import { Separator } from "./ui/separator";
import axios, { AxiosError } from "axios";
import axiosInstance from "@/lib/axiosInstance";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PLAN_LIMITS } from "@/lib/plans";
import { useTranslation } from "react-i18next";
import Image from "next/image";

interface Tweet {
  _id: string;
}

const TweetComposer = ({
  onTweetPosted,
}: {
  onTweetPosted?: (tweet: Tweet) => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageurl, setimageurl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const maxLength = 200;

  const planLimit =
    user?.plan && user.plan in PLAN_LIMITS ? PLAN_LIMITS[user.plan] : 1;
  const tweetsUsed = user?.tweetCount ?? 0;
  const remaining =
    planLimit === null ? Infinity : Math.max(0, planLimit - tweetsUsed);
  const limitReached = planLimit !== null && tweetsUsed >= planLimit;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    if (isLoading) return;
    if (limitReached) {
      toast(t("composer.planLimit"), "error");
      return;
    }
    setIsLoading(true);
    try {
      const tweetdata = {
        author: user?._id,
        content,
        image: imageurl,
      };
      const res = await axiosInstance.post("/post", tweetdata);
      onTweetPosted?.(res.data);
      setContent("");
      setimageurl("");
      toast(t("composer.posted"), "success");
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 403 && error.response?.data?.error) {
          toast(error.response.data.error, "error");
        } else {
          toast(t("composer.error"), "error");
        }
      } else {
        toast(t("composer.error"), "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > maxLength;
  const isNearLimit = characterCount > maxLength * 0.8;
  if (!user) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    const image = e.target.files[0];
    const formdataimg = new FormData();
    formdataimg.set("image", image);
    try {
      const res = await axios.post(
        `https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY}`,
        formdataimg
      );
      const url = res.data.data.display_url;
      if (url) {
        setimageurl(url);
        toast(t("composer.imageAttached"), "success");
      }
    } catch {
      toast(t("composer.imageUploadFailed"), "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="bg-black border-gray-800 border-x-0 border-t-0 rounded-none">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar} alt={user.displayName} />
            <AvatarFallback>{user.displayName?.[0] || "?"}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <form onSubmit={handleSubmit}>
              <Textarea
                placeholder={t("composer.placeholder")}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-transparent border-none text-xl text-white placeholder-gray-500 resize-none min-h-[120px] focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              {imageurl && (
                <div className="relative mb-3 mt-1 overflow-hidden rounded-2xl border border-gray-800" style={{ aspectRatio: "16/9" }}>
                  <Image
                    src={imageurl}
                    alt={t("composer.imagePreview")}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <button
                    type="button"
                    onClick={() => setimageurl("")}
                    aria-label={t("composer.removeImage")}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white transition-colors hover:bg-black z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="mt-4 flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center text-blue-400">
                    <label
                      htmlFor="tweetImage"
                      className="cursor-pointer rounded-full p-2 transition-all hover:bg-blue-900/20 active:scale-90"
                      title={isUploading ? t("composer.uploading") : t("composer.addImage")}
                    >
                      {isUploading ? (
                        <span className="block h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      ) : (
                        <LucideImage className="h-5 w-5" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="tweetImage"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={isUploading || isLoading}
                      />
                    </label>
                    {[BarChart3, Smile, Calendar, MapPin].map((Icon, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant="ghost"
                        size="sm"
                        title={t("composer.comingSoon")}
                        disabled
                        className="cursor-not-allowed rounded-full p-2 text-gray-600 opacity-70 hover:bg-transparent"
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="hidden items-center space-x-2 sm:flex">
                      <Globe className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-semibold text-blue-400">
                        {t("composer.everyoneCanReply")}
                      </span>
                    </div>
                    {characterCount > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="relative h-8 w-8">
                          <svg className="h-8 w-8 -rotate-90">
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              className="text-gray-700"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 14}`}
                              strokeDashoffset={`${
                                2 * Math.PI * 14 * (1 - characterCount / maxLength)
                              }`}
                              className={
                                isOverLimit
                                  ? "text-red-500"
                                  : isNearLimit
                                    ? "text-yellow-500"
                                    : "text-blue-500"
                              }
                            />
                          </svg>
                        </div>
                        {isNearLimit && (
                          <span
                            className={`text-sm ${
                              isOverLimit ? "text-red-500" : "text-yellow-500"
                            }`}
                          >
                            {maxLength - characterCount}
                          </span>
                        )}
                      </div>
                    )}
                    <Separator
                      orientation="vertical"
                      className="h-6 bg-gray-700"
                    />
                    <Button
                      type="submit"
                      disabled={
                        !content.trim() ||
                        isOverLimit ||
                        isLoading ||
                        limitReached
                      }
                      className="rounded-full bg-blue-500 px-6 font-semibold text-white transition-all hover:bg-blue-600 active:scale-95 disabled:bg-gray-700 disabled:text-gray-500"
                    >
                      {isLoading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        t("composer.post")
                      )}
                    </Button>
                  </div>
                </div>

                {limitReached && (
                  <div className="mt-3 flex flex-col items-start gap-2 rounded-xl border border-red-800 bg-red-900/20 p-3 text-sm text-red-400 sm:flex-row sm:items-center">
                    <span>{t("composer.limitReached")}</span>
                    <Link
                      href="/pricing"
                      className="font-semibold text-blue-400 hover:underline"
                    >
                      {t("composer.upgradePlan")}
                    </Link>
                  </div>
                )}

                {!limitReached && remaining !== Infinity && (
                  <div className="mt-3 text-right text-xs text-gray-500">
                    {t("composer.remaining", { count: remaining })}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TweetComposer;
