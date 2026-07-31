"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Loader2, Send } from "lucide-react";
import TweetCard, { type Tweet } from "./TweetCard";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { timeAgo } from "@/lib/time";

interface CommentAuthor {
  _id: string;
  displayName: string;
  username: string;
  avatar?: string;
}

interface Comment {
  _id: string;
  tweet: string;
  author: CommentAuthor;
  content: string;
  timestamp: string;
}

export default function CommentModal({
  tweet,
  open,
  onClose,
}: {
  tweet: Tweet;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setComments([]);
    setText("");
    setLoading(true);
    let cancelled = false;
    const fetchComments = async () => {
      try {
        const res = await axiosInstance.get(`/comments/${tweet._id}`);
        if (!cancelled) setComments(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setComments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchComments();
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      cancelled = true;
    };
  }, [open, tweet._id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submitComment = async () => {
    const content = text.trim();
    if (!content || !user) {
      toast("Log in to comment", "error");
      return;
    }
    setSending(true);
    try {
      const res = await axiosInstance.post(`/comments/${tweet._id}`, {
        author: user._id,
        content,
      });
      setComments((prev) => [...prev, res.data]);
      setText("");
    } catch {
      toast("Failed to post comment", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-lg font-bold text-white">Post</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TweetCard tweet={tweet} />
          <div className="border-t border-gray-800">
            <div className="px-4 py-3 text-sm font-semibold text-gray-400">
              Replies
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
              </div>
            ) : comments.length === 0 ? (
              <p className="px-4 pb-6 text-center text-sm text-gray-500">
                No replies yet. Start the conversation!
              </p>
            ) : (
              <div className="divide-y divide-gray-800">
                {comments.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-start gap-3 p-4 transition-colors hover:bg-gray-900/40"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={c.author.avatar || ""} alt={c.author.displayName} />
                      <AvatarFallback>{c.author.displayName?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[15px] font-semibold text-white">
                          {c.author.displayName}
                        </span>
                        <span className="truncate text-sm text-gray-500">
                          @{c.author.username}
                        </span>
                        <span className="text-gray-500">·</span>
                        <span className="shrink-0 text-sm text-gray-500">
                          {timeAgo(c.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 break-words text-white">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-gray-800 p-4">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user?.avatar || ""} alt={user?.displayName || ""} />
            <AvatarFallback>{user?.displayName?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitComment();
              }
            }}
            placeholder="Post your reply"
            maxLength={200}
            className="flex-1 border-b border-transparent bg-transparent py-2 text-white placeholder-gray-500 outline-none focus:border-blue-500"
          />
          <button
            onClick={submitComment}
            disabled={sending || !text.trim()}
            aria-label="Post comment"
            className="rounded-full bg-blue-500 p-2 text-white transition-all hover:bg-blue-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
