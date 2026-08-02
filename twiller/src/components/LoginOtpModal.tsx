"use client";

import React, { useEffect, useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import LoadingSpinner from "./loading-spinner";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { useAuth } from "@/context/AuthContext";
import { getFirebaseErrorMessage } from "@/lib/firebaseErrors";
import TwitterLogo from "./Twitterlogo";
import { useTranslation } from "react-i18next";

export default function LoginOtpModal() {
  const { verifyLoginOtp, cancelLoginOtp } = useAuth();
  const { t } = useTranslation();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelLoginOtp();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!/^\d{6}$/.test(otp)) {
      setError(t("loginOtp.enterCode"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await verifyLoginOtp(otp);
    } catch (err) {
      setError(getFirebaseErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150"
      onClick={() => cancelLoginOtp()}
    >
      <Card
        className="w-full max-w-md rounded-2xl border-gray-800 bg-black text-white animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="relative pb-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-gray-900"
            onClick={() => cancelLoginOtp()}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <TwitterLogo size="xl" className="text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {t("loginOtp.title")}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-start space-x-3 rounded-lg border border-blue-800 bg-blue-900/20 p-3 text-sm text-blue-300">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{t("loginOtp.desc")}</p>
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
              placeholder={t("loginOtp.placeholder")}
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
                  <span>{t("loginOtp.verifying")}</span>
                </div>
              ) : (
                t("loginOtp.verify")
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              {t("loginOtp.changedMind")}{" "}
              <Button
                variant="link"
                className="px-1 text-blue-400 hover:text-blue-300 font-semibold"
                onClick={() => cancelLoginOtp()}
                disabled={submitting}
              >
                {t("loginOtp.cancelSignOut")}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
