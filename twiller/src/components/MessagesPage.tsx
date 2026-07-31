"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Mail,
  PenSquare,
  Search,
  X,
  Send,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface ConversationUser {
  _id: string;
  displayName: string;
  username: string;
  avatar?: string;
}

interface Message {
  _id: string;
  sender: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface Conversation {
  _id: string;
  participants: ConversationUser[];
  messages: Message[];
  updatedAt: string;
}

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString("en-us", {
    month: "short",
    day: "numeric",
  });
};

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<ConversationUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerQuery, setComposerQuery] = useState("");
  const [composerResults, setComposerResults] = useState<ConversationUser[]>([]);
  const [composerSearching, setComposerSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/conversations", {
        params: { userId: user?._id },
      });
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch {
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const refreshMessages = useCallback(async () => {
    if (!activeId || !otherUser?._id) return;
    try {
      const res = await axiosInstance.get("/conversation", {
        params: { userId: user?._id, otherId: otherUser._id },
      });
      const convo: Conversation = res.data;
      if (!convo || convo._id !== activeId) return;
      setMessages(convo.messages);
      if (convo.messages.some((m) => !m.read && m.sender !== user?._id)) {
        axiosInstance
          .post("/conversations/read", {
            userId: user?._id,
            conversationId: convo._id,
          })
          .catch(() => {});
      }
    } catch {
      // ignore polling errors
    }
  }, [activeId, otherUser?._id, user?._id]);

  useEffect(() => {
    if (!activeId) return;
    refreshMessages();
    const interval = setInterval(refreshMessages, 4000);
    return () => clearInterval(interval);
  }, [activeId, refreshMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const openConversation = async (other: ConversationUser) => {
    setOtherUser(other);
    setLoadingChat(true);
    setComposerOpen(false);
    try {
      const res = await axiosInstance.post("/conversation", {
        userId: user?._id,
        otherId: other._id,
      });
      const convo: Conversation = res.data;
      setActiveId(convo._id);
      setMessages(convo.messages);
      fetchConversations();
    } catch {
      toast("Could not open conversation", "error");
    } finally {
      setLoadingChat(false);
    }
  };

  const selectConversation = (convo: Conversation) => {
    const other = convo.participants.find((p) => p._id !== user?._id) || null;
    setActiveId(convo._id);
    setOtherUser(other);
    setMessages(convo.messages);
  };

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || !otherUser?._id) return;
    setSending(true);
    try {
      const res = await axiosInstance.post("/message", {
        userId: user?._id,
        otherId: otherUser._id,
        content,
      });
      const convo: Conversation = res.data;
      setMessages(convo.messages);
      setText("");
      if (!activeId) setActiveId(convo._id);
      fetchConversations();
    } catch {
      toast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (composerTimer.current) clearTimeout(composerTimer.current);
    const q = composerQuery.trim();
    if (!q) {
      setComposerResults([]);
      setComposerSearching(false);
      return;
    }
    setComposerSearching(true);
    composerTimer.current = setTimeout(async () => {
      try {
        const res = await axiosInstance.get("/users/search", { params: { q } });
        setComposerResults(
          (Array.isArray(res.data) ? res.data : []).filter(
            (u: ConversationUser) => u._id !== user?._id
          )
        );
      } catch {
        setComposerResults([]);
      } finally {
        setComposerSearching(false);
      }
    }, 300);
    return () => {
      if (composerTimer.current) clearTimeout(composerTimer.current);
    };
  }, [composerQuery, user?._id]);

  const isOwn = (msg: Message) => msg.sender === user?._id;

  const listItem = (convo: Conversation) => {
    const other = convo.participants.find((p) => p._id !== user?._id);
    if (!other) return null;
    const last = convo.messages[convo.messages.length - 1];
    return (
      <button
        key={convo._id}
        onClick={() => selectConversation(convo)}
        className={`flex w-full items-center gap-3 border-b border-gray-800 p-4 text-left transition-colors hover:bg-gray-900/40 ${
          activeId === convo._id ? "bg-gray-900/60" : ""
        }`}
      >
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarImage src={other.avatar || ""} alt={other.displayName} />
          <AvatarFallback>{other.displayName?.[0] || "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold text-white">
              {other.displayName}
            </span>
            <span className="shrink-0 text-xs text-gray-500">
              {timeAgo(convo.updatedAt)}
            </span>
          </div>
          <div className="truncate text-sm text-gray-400">
            {last
              ? `${isOwn(last) ? "You: " : ""}${last.content}`
              : "No messages yet"}
          </div>
        </div>
      </button>
    );
  };

  const messageBubble = (msg: Message) => {
    const own = isOwn(msg);
    return (
      <div key={msg._id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-2 text-[15px] leading-relaxed ${
            own
              ? "rounded-br-md bg-blue-500 text-white"
              : "rounded-bl-md border border-gray-800 bg-gray-900 text-white"
          }`}
        >
          <p className="break-words whitespace-pre-wrap">{msg.content}</p>
          <div
            className={`mt-1 flex items-center gap-1 text-xs ${
              own ? "text-blue-100" : "text-gray-500"
            }`}
          >
            <span>{timeAgo(msg.timestamp)}</span>
            {own && (
              <CheckCheck
                className={`h-3.5 w-3.5 ${msg.read ? "" : "text-blue-200"}`}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen min-h-screen">
      <div
        className={`flex w-full flex-col border-r border-gray-800 lg:w-80 ${
          activeId ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h1 className="text-xl font-bold text-white">Messages</h1>
          <button
            onClick={() => setComposerOpen(true)}
            aria-label="New message"
            className="rounded-full p-2 text-gray-300 transition-colors hover:bg-gray-900"
          >
            <PenSquare className="h-5 w-5" />
          </button>
        </div>

        {loadingList ? (
          <div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="skeleton h-11 w-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-28 rounded-full" />
                  <div className="skeleton h-3 w-40 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-800">
              <Mail className="h-7 w-7 text-gray-500" />
            </div>
            <p className="mb-1 text-lg font-bold text-white">No messages yet</p>
            <p className="mb-4 text-sm text-gray-500">
              Start a conversation by messaging someone.
            </p>
            <button
              onClick={() => setComposerOpen(true)}
              className="rounded-full bg-blue-500 px-5 py-2 font-semibold text-white transition-all hover:bg-blue-600 active:scale-95"
            >
              New message
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {conversations.map(listItem)}
          </div>
        )}
      </div>

      <div
        className={`flex-1 flex-col ${activeId ? "flex" : "hidden lg:flex"}`}
      >
        {loadingChat ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
          </div>
        ) : otherUser && activeId ? (
          <>
            <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
              <button
                onClick={() => setActiveId(null)}
                aria-label="Back to messages"
                className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-900 lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={otherUser.avatar || ""} alt={otherUser.displayName} />
                <AvatarFallback>{otherUser.displayName?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate font-bold text-white">
                  {otherUser.displayName}
                </div>
                <div className="truncate text-sm text-gray-500">
                  @{otherUser.username}
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  Say hi to @{otherUser.username}
                </p>
              ) : (
                messages.map(messageBubble)
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex items-center gap-2 border-t border-gray-800 p-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Start a new message"
                maxLength={500}
                className="flex-1 rounded-full border border-gray-800 bg-gray-900 px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-blue-500"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !text.trim()}
                aria-label="Send message"
                className="rounded-full bg-blue-500 p-2.5 text-white transition-all hover:bg-blue-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-800">
              <Mail className="h-8 w-8 text-gray-500" />
            </div>
            <p className="mb-1 text-2xl font-bold text-white">
              Select a message
            </p>
            <p className="max-w-xs text-sm text-gray-500">
              Choose a conversation from the left to start chatting.
            </p>
          </div>
        )}
      </div>

      {composerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setComposerOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <h2 className="text-lg font-bold text-white">New message</h2>
              <button
                onClick={() => setComposerOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  autoFocus
                  value={composerQuery}
                  onChange={(e) => setComposerQuery(e.target.value)}
                  placeholder="Search people"
                  className="rounded-full border-gray-800 bg-gray-900 py-2 pl-10 text-white placeholder-gray-500"
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto border-t border-gray-800">
              {composerSearching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
                </div>
              ) : composerQuery.trim() && composerResults.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  No people found
                </p>
              ) : (
                composerResults.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => openConversation(u)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-900/50"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={u.avatar || ""} alt={u.displayName} />
                      <AvatarFallback>{u.displayName?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">
                        {u.displayName}
                      </div>
                      <div className="truncate text-sm text-gray-500">
                        @{u.username}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
