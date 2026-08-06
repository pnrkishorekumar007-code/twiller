"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

import { ArrowLeft, Mail } from "lucide-react";

import LoadingSpinner from "./loading-spinner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/context/AuthContext";

interface OTPVerificationProps {
  email: string;
  purpose: "signup" | "login";
  onSuccess: (user?: User | null) => void;
  onCancel: () => void;
}

const OTP_DIGITS = 6;
const RESEND_COOLDOWN = 60;

const getErrorMessage = (err: unknown, fallback: string) => {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || fallback;
  }
  return fallback;
};

export default function OTPVerification({
  email,
  purpose,
  onSuccess,
  onCancel,
}: OTPVerificationProps) {
  const { sendOtp, verifyOtp } = useAuth();
  const [digits, setDigits] = useState<string[]>(Array(OTP_DIGITS).fill(""));
  const [sending, setSending] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");
  const isComplete = code.length === OTP_DIGITS;

  useEffect(() => {
    handleSend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      await sendOtp(email, purpose);
      setCountdown(RESEND_COOLDOWN);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send code. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);

    if (cleaned && index < OTP_DIGITS - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_DIGITS);
    if (!pasted) return;
    const next = Array(OTP_DIGITS).fill("");
    pasted.split("").forEach((char, i) => {
      next[i] = char;
    });
    setDigits(next);
    const focusIndex = Math.min(pasted.length, OTP_DIGITS - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async () => {
    if (!isComplete || verifying) return;
    setVerifying(true);
    setError("");
    try {
      const user = await verifyOtp(email, code, purpose);
      await onSuccess(user);
    } catch (err) {
      setError(getErrorMessage(err, "Verification failed. Please try again."));
      setDigits(Array(OTP_DIGITS).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const canResend = !sending && countdown <= 0;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex items-center justify-center">
        <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Mail className="h-6 w-6 text-blue-400" />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-xl font-bold text-white">
          {purpose === "signup" ? "Verify your email" : "Check your email"}
        </h3>
        <p className="mt-2 text-gray-400 text-sm">
          We sent a 6-digit code to
          <br />
          <span className="font-semibold text-white">{email}</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <Input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={sending || verifying}
            aria-label={`Digit ${index + 1}`}
            className="h-14 w-12 bg-transparent border-gray-600 text-white text-center text-2xl font-bold focus:border-blue-500 disabled:opacity-50"
          />
        ))}
      </div>

      <Button
        type="button"
        onClick={handleVerify}
        disabled={!isComplete || verifying || sending}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-full text-lg"
      >
        {verifying ? (
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="sm" />
            <span>Verifying...</span>
          </div>
        ) : (
          "Verify code"
        )}
      </Button>

      <div className="text-center text-sm text-gray-400">
        {sending ? (
          <span className="inline-flex items-center gap-2">
            <LoadingSpinner size="sm" /> Sending code...
          </span>
        ) : canResend ? (
          <>
            Didn&apos;t receive it?{" "}
            <button
              type="button"
              onClick={handleSend}
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              Resend code
            </button>
          </>
        ) : (
          <>Resend code in {countdown}s</>
        )}
      </div>
    </div>
  );
}
