"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import axiosInstance from "@/lib/axiosInstance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  isAudioUploadWindowOpen,
  audioWindowCountdown,
} from "@/lib/istTime";
import {
  Mic,
  Square,
  Upload,
  Clock,
  FileAudio,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const MAX_DURATION = 300;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export default function AudioTweetPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [content, setContent] = useState("");
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [step, setStep] = useState<"record" | "otp" | "upload">("record");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [windowOpen, setWindowOpen] = useState(isAudioUploadWindowOpen);
  const [countdown, setCountdown] = useState(audioWindowCountdown);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);
      if (elapsedRef.current >= MAX_DURATION) {
        stopRecording();
      }
    }, 1000);
  };

  useEffect(() => {
    const id = setInterval(() => {
      setWindowOpen(isAudioUploadWindowOpen());
      setCountdown(audioWindowCountdown());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const cleanup = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  useEffect(() => {
    const prevUrl = audioUrl;
    return () => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    if (!isAudioUploadWindowOpen()) {
      setError(
        t("audio.tweetWindow", { start: "2:00 PM", end: "7:00 PM" })
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onloadedmetadata = () => {
          setDuration(audio.duration);
        };
      };

      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      elapsedRef.current = 0;
      setElapsedSeconds(0);
      setError("");

      startTimer();
    } catch {
      setError(t("audio.micDenied"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setIsRecording(false);
    setIsPaused(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const togglePause = () => {
    if (isPaused) {
      mediaRecorderRef.current?.resume();
      startTimer();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current?.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPaused(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const requestOtp = async () => {
    if (!isAudioUploadWindowOpen()) {
      setError(
        t("audio.tweetWindow", { start: "2:00 PM", end: "7:00 PM" })
      );
      return;
    }
    if (!audioBlob) {
      setError(t("audio.noAudio"));
      return;
    }
    if (audioBlob.size > MAX_FILE_SIZE) {
      setError(t("audio.fileTooLarge"));
      return;
    }
    if (duration > MAX_DURATION) {
      setError(t("audio.durationTooLong"));
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    setError("");
    try {
      await axiosInstance.post("/audio/request-otp");
      setOtpVerified(false);
      setStep("otp");
      toast(t("audio.otpSent"), "success");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr?.response?.data?.error || t("audio.otpFailed"));
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError(t("audio.otpInvalid"));
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    setError("");
    try {
      await axiosInstance.post("/audio/verify-otp", { otp });
      setOtpVerified(true);
      setStep("upload");
      toast(t("audio.otpVerified"), "success");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setOtpError(axiosErr?.response?.data?.error || t("audio.otpFailed"));
    } finally {
      setOtpLoading(false);
    }
  };

  const uploadTweet = async () => {
    if (!audioBlob || !otpVerified) return;
    if (!isAudioUploadWindowOpen()) {
      setError(
        t("audio.tweetWindow", { start: "2:00 PM", end: "7:00 PM" })
      );
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    setError("");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      if (content.trim()) formData.append("content", content.trim());

      await axiosInstance.post("/audio/post", formData, {
        onUploadProgress: (e) => {
          if (e.total) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      });
      setSuccess(true);
      setStep("record");
      setAudioBlob(null);
      setAudioUrl(null);
      setDuration(0);
      setContent("");
      setOtp("");
      setOtpVerified(false);
      toast(t("audio.uploadSuccess"), "success");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr?.response?.data?.error || t("audio.uploadFailed"));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const reset = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setContent("");
    setOtp("");
    setOtpVerified(false);
    setError("");
    setSuccess(false);
    setStep("record");
    cleanup();
  };

  const progressColor =
    uploadProgress === 100 ? "bg-green-500" : "bg-blue-500";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-white">
        {t("audio.title")}
      </h1>

      {success ? (
        <Card className="border-gray-800 bg-black">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
            <h2 className="mb-2 text-xl font-bold text-white">
              {t("audio.uploaded")}
            </h2>
            <p className="text-gray-400">{t("audio.uploadedDesc")}</p>
            <Button
              variant="outline"
              className="mt-4 rounded-full border-gray-600 bg-gray-950 px-6 font-semibold text-white hover:bg-gray-900"
              onClick={reset}
            >
              {t("audio.newTweet")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Window status */}
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${
              windowOpen
                ? "border-green-800 bg-green-950/40 text-green-400"
                : "border-gray-700 bg-gray-900/60 text-gray-300"
            }`}
          >
            <Clock className="h-5 w-5 shrink-0" />
            {windowOpen ? (
              <p>
                {t("audio.windowOpen", { start: "2:00 PM", end: "7:00 PM" })}
                <span className="ml-2 font-mono">
                  {countdown.hours}:{countdown.minutes}:{countdown.seconds}
                </span>
              </p>
            ) : (
              <p>
                {t("audio.windowClosed", {
                  start: "2:00 PM",
                  end: "7:00 PM",
                })}{" "}
                <span className="ml-1 font-mono text-blue-400">
                  {countdown.hours}:{countdown.minutes}:{countdown.seconds}
                </span>
              </p>
            )}
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            {(["record", "otp", "upload"] as const).map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    step === s
                      ? "bg-blue-500 text-white"
                      : ["record", "otp", "upload"].indexOf(step) > i
                      ? "bg-green-500 text-white"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      ["record", "otp", "upload"].indexOf(step) > i
                        ? "bg-green-500"
                        : "bg-gray-800"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Record */}
          {step === "record" && (
            <Card className="border-gray-800 bg-black">
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-bold text-white">
                  {t("audio.recordTitle")}
                </h2>

                {error && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-950/50 p-3 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Recording Controls */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`flex h-20 w-20 items-center justify-center rounded-full border-4 transition-all ${
                        isRecording
                          ? "border-red-500 bg-red-500/20"
                          : "border-gray-600 bg-gray-900 hover:bg-gray-800"
                      }`}
                      aria-label={isRecording ? "Stop recording" : "Start recording"}
                    >
                      {isRecording ? (
                        <Square className="h-8 w-8 text-red-500" />
                      ) : (
                        <Mic className="h-8 w-8 text-gray-400" />
                      )}
                    </button>
                    {isRecording && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 animate-pulse rounded-full bg-red-500" />
                    )}
                  </div>

                  {/* Timer */}
                  <div className="flex items-center gap-2 text-white">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="font-mono text-2xl font-bold">
                      {formatTime(elapsedSeconds)}
                    </span>
                    <span className="text-sm text-gray-400">
                      / {formatTime(MAX_DURATION)}
                    </span>
                  </div>

                  {/* Pause/Resume */}
                  {isRecording && (
                    <Button
                      variant="outline"
                      className="rounded-full border-gray-600 bg-gray-950 px-6 font-semibold text-white hover:bg-gray-900"
                      onClick={togglePause}
                    >
                      {isPaused ? "Resume" : "Pause"}
                    </Button>
                  )}

                  {/* Preview */}
                  {audioUrl && !isRecording && (
                    <div className="w-full space-y-3">
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        controls
                        className="w-full"
                      />
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>
                          <FileAudio className="mr-1 inline h-4 w-4" />
                          {(audioBlob ? audioBlob.size / 1024 / 1024 : 0).toFixed(2)} MB
                        </span>
                        <span>
                          {formatTime(Math.floor(duration))}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Continue Button */}
                  {audioBlob && !isRecording && (
                    <Button
                      className="w-full rounded-full bg-blue-500 py-3 font-semibold text-white transition-all hover:bg-blue-600 active:scale-[0.98]"
                      onClick={requestOtp}
                    >
                      {t("audio.continue")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: OTP Verification */}
          {step === "otp" && (
            <Card className="border-gray-800 bg-black">
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-bold text-white">
                  {t("audio.otpTitle")}
                </h2>
                <p className="mb-4 text-sm text-gray-400">
                  {t("audio.otpDesc")}
                </p>

                {otpError && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-950/50 p-3 text-sm text-red-400">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {otpError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="otp-input"
                      className="mb-2 block text-sm font-medium text-gray-400"
                    >
                      {t("audio.otpLabel")}
                    </Label>
                    <Input
                      id="otp-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtp(v);
                        setOtpError("");
                      }}
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-center text-2xl font-mono tracking-widest text-white outline-none focus:border-blue-500"
                      placeholder="000000"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-full border-gray-600 bg-gray-950 px-6 font-semibold text-white hover:bg-gray-900"
                      onClick={() => {
                        setOtpVerified(false);
                        setOtp("");
                        setOtpError("");
                        setStep("record");
                      }}
                    >
                      {t("audio.back")}
                    </Button>
                    <Button
                      className="flex-1 rounded-full bg-blue-500 py-3 font-semibold text-white transition-all hover:bg-blue-600 active:scale-[0.98]"
                      onClick={verifyOtp}
                      disabled={otp.length !== 6 || otpLoading}
                    >
                      {otpLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {t("audio.verifyOtp")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Upload */}
          {step === "upload" && (
            <Card className="border-gray-800 bg-black">
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-bold text-white">
                  {t("audio.uploadTitle")}
                </h2>

                {error && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-950/50 p-3 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Audio Preview */}
                <div className="mb-4 rounded-lg bg-gray-950 p-4">
                  <audio
                    ref={audioRef}
                    src={audioUrl || undefined}
                    controls
                    className="w-full"
                  />
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-400">
                    <span>
                      <FileAudio className="mr-1 inline h-4 w-4" />
                      {((audioBlob?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <span>
                      {formatTime(Math.floor(duration))}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-4">
                  <Label
                    htmlFor="audio-content"
                    className="mb-2 block text-sm font-medium text-gray-400"
                  >
                    {t("audio.contentLabel")}
                  </Label>
                  <Textarea
                    id="audio-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t("audio.contentPlaceholder")}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-blue-500"
                    rows={3}
                    maxLength={280}
                  />
                  <div className="mt-1 text-right text-xs text-gray-500">
                    {content.length}/280
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        {t("audio.uploading")}
                      </span>
                      <span className="text-white">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                      <div
                        className={`h-full transition-all duration-300 ${progressColor}`}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full border-gray-600 bg-gray-950 px-6 font-semibold text-white hover:bg-gray-900"
                    onClick={() => setStep("otp")}
                    disabled={isUploading}
                  >
                    {t("audio.back")}
                  </Button>
                  <Button
                    className="flex-1 rounded-full bg-blue-500 py-3 font-semibold text-white transition-all hover:bg-blue-600 active:scale-[0.98]"
                    onClick={uploadTweet}
                    disabled={isUploading || !otpVerified}
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {t("audio.post")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}