"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Tablet,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNav } from "@/context/NavContext";
import axiosInstance from "@/lib/axiosInstance";
import { timeAgo } from "@/lib/time";
import { Button } from "./ui/button";

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

const DeviceIcon = ({ device }: { device: LoginHistoryEntry["device"] }) => {
  if (device === "mobile") {
    return <Smartphone className="h-5 w-5 text-gray-400" />;
  }
  if (device === "tablet") {
    return <Tablet className="h-5 w-5 text-gray-400" />;
  }
  return <Monitor className="h-5 w-5 text-gray-400" />;
};

export default function LoginActivityPage() {
  const { user } = useAuth();
  const { goBack } = useNav();
  const { t } = useTranslation();
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        const res = await axiosInstance.get("/auth/login-history");
        if (!cancelled) {
          setHistory(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-black/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center space-x-8">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2 transition-colors hover:bg-gray-900"
            onClick={goBack}
            aria-label={t("loginActivity.back")}
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">
              {t("loginActivity.title")}
            </h1>
            <p className="text-sm text-gray-500">@{user?.username}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-800 bg-blue-900/20 p-4 text-sm text-blue-300">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{t("loginActivity.desc")}</p>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-800">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/3 rounded-full" />
                  <div className="skeleton h-3 w-1/3 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-gray-600" />
            <p className="text-lg font-semibold text-gray-300">
              {t("loginActivity.loadFailed")}
            </p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-800">
              <Clock className="h-7 w-7 text-gray-500" />
            </div>
            <p className="mb-1 text-lg font-bold text-white">
              {t("loginActivity.emptyTitle")}
            </p>
            <p className="max-w-xs text-sm text-gray-500">
              {t("loginActivity.emptyDesc")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {history.map((entry, index) => (
              <div
                key={entry._id}
                className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-gray-900/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-800">
                    <DeviceIcon device={entry.device} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-white">
                      {entry.browser}
                      {entry.browserVersion
                        ? ` ${entry.browserVersion}`
                        : ""}
                      <span className="text-gray-500"> · </span>
                      <span className="text-gray-400">{entry.os}</span>
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {entry.ip}
                      {index === 0 && (
                        <span className="ml-2 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-400">
                          {t("loginActivity.current")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-500">
                    {timeAgo(entry.timestamp)}
                  </p>
                  <p
                    className={`mt-0.5 flex items-center justify-end gap-1 text-xs ${
                      entry.otpVerified ? "text-green-400" : "text-gray-500"
                    }`}
                  >
                    {entry.otpVerified ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {t("loginActivity.otpVerified")}
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {t("loginActivity.noOtp")}
                      </>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
