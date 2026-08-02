"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, ShieldCheck, Phone } from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import LoadingSpinner from "./loading-spinner";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import TwitterLogo from "./Twitterlogo";

interface LanguageOtpModalProps {
  targetLanguage: string;
  onClose: () => void;
}

export default function LanguageOtpModal({
  targetLanguage,
  onClose,
}: LanguageOtpModalProps) {
  const { t } = useTranslation();
  const { updateLanguage } = useAuth();
  const { toast } = useToast();

  const [channel, setChannel] = useState<"email" | "sms" | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const requestOtp = async () => {
    setRequesting(true);
    setError("");
    try {
      const res = await axiosInstance.post("/api/language/request-otp", {
        targetLanguage,
      });
      setChannel(res.data?.channel === "sms" ? "sms" : "email");
    } catch (err) {
      const code = (err as {
        response?: { data?: { error?: string } };
      })?.response?.data?.error;
      if (code === "no_phone") {
        setError(t("language.noPhone"));
      } else {
        setError(t("language.requestFailed"));
      }
    } finally {
      setRequesting(false);
    }
  };

  useEffect(() => {
    requestOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!/^\d{6}$/.test(otp)) {
      setError(t("language.enterCode"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await axiosInstance.post("/api/language/verify-otp", {
        otp,
        targetLanguage,
      });
      updateLanguage(res.data?.user?.language ?? targetLanguage);
      toast(t("language.success"), "success");
      onClose();
    } catch (err) {
      const code = (err as {
        response?: { data?: { error?: string } };
      })?.response?.data?.error;
      const keyMap: Record<string, string> = {
        invalid: "language.invalid",
        expired: "language.expired",
        incorrect: "language.incorrect",
        tooMany: "language.tooMany",
      };
      setError(
        t(
          (code && keyMap[code]) || "language.requestFailed"
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <Card
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border-gray-800 bg-black text-white animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="relative pb-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-gray-900"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <TwitterLogo size="xl" className="text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {t("language.modalTitle")}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {requesting ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="flex items-start space-x-3 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
                {channel === "sms" && error === t("language.noPhone") ? (
                  <Phone className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <p>{error}</p>
              </div>
              {error === t("language.noPhone") ? (
                <p className="text-sm text-gray-400">
                  {t("language.addPhoneHint")}
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full border-gray-700 text-white hover:bg-gray-900"
                  onClick={requestOtp}
                >
                  {t("common.tryAgain")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-start space-x-3 rounded-lg border border-blue-800 bg-blue-900/20 p-3 text-sm text-blue-300">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  {channel === "sms"
                    ? t("language.channelSms")
                    : t("language.channelEmail")}
                </p>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    if (error) setError("");
                  }}
                  className="bg-transparent border-gray-600 text-white text-center text-2xl tracking-[0.5em] placeholder-gray-600 focus:border-blue-500"
                  disabled={submitting}
                  autoFocus
                />

                <Button
                  type="submit"
                  className="w-full rounded-full bg-blue-500 py-3 text-lg font-semibold text-white transition-all hover:bg-blue-600 active:scale-[0.98]"
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>{t("language.verifying")}</span>
                    </div>
                  ) : (
                    t("language.verify")
                  )}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
