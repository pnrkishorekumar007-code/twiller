"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import TwitterLogo from "./Twitterlogo";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "@/context/ToastContext";

export default function ForgotPassword() {
  const router = useRouter();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = identifier.trim();
    if (!value || loading) return;
    setLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password", { identifier: value });
      setSubmitted(true);
      setIdentifier("");
    } catch (error: unknown) {
      const msg = (
        error as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      toast(msg || "Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
      <Card className="w-full max-w-md rounded-2xl border-gray-800 bg-black text-white">
        <CardHeader className="relative pb-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-4 text-white hover:bg-gray-900"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <TwitterLogo size="xl" className="text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Find your account
            </CardTitle>
            <p className="mt-1 text-sm text-gray-400">
              Enter your email or phone number and we&apos;ll send you a new
              password.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {submitted ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-400">
                <KeyRound className="h-6 w-6" />
              </div>
              <p className="text-sm leading-relaxed text-gray-300">
                If an account exists, a new password has been sent to the
                registered email.
              </p>
              <Button
                onClick={() => router.push("/")}
                className="w-full rounded-full bg-blue-500 py-3 font-semibold text-white transition-all hover:bg-blue-600 active:scale-[0.98]"
              >
                Back to home
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-white">
                  Email or phone number
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="you@example.com or +91 00000 00000"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-full bg-blue-500 py-3 text-lg font-semibold text-white transition-all hover:bg-blue-600 active:scale-[0.98]"
                disabled={loading || !identifier.trim()}
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Sending...</span>
                  </span>
                ) : (
                  "Send password reset"
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-gray-400">Remembered your password?</span>{" "}
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="font-semibold text-blue-400 transition-colors hover:text-blue-300"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
