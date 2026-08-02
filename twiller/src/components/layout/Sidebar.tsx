"use client";

import React from "react";
import Link from "next/link";

import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  User,
  MoreHorizontal,
  Settings,
  LogOut,
  Crown,
  AudioLines,
  Clock,
  Globe,
  Sun,
  Moon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import TwitterLogo from "../Twitterlogo";
import { useAuth } from "@/context/AuthContext";
import { useNotificationsUnread } from "@/lib/useNotificationsUnread";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export default function Sidebar({
  currentPage = "home",
  onNavigate,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const unreadCount = useNotificationsUnread(user?._id);
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  const navigation = [
    { name: t("nav.home"), icon: Home, current: currentPage === "home", page: "home" },
    { name: t("nav.explore"), icon: Search, current: currentPage === "explore", page: "explore" },
    { name: t("nav.notifications"), icon: Bell, current: currentPage === "notifications", page: "notifications", badge: true },
    { name: t("nav.messages"), icon: Mail, current: currentPage === "messages", page: "messages" },
    { name: t("nav.bookmarks"), icon: Bookmark, current: currentPage === "bookmarks", page: "bookmarks" },
    { name: t("nav.audioTweets"), icon: AudioLines, current: currentPage === "audio", page: "audio" },
    { name: t("nav.profile"), icon: User, current: currentPage === "profile", page: "profile" },
    { name: t("nav.loginActivity"), icon: Clock, current: currentPage === "login-activity", page: "login-activity" },
    { name: t("nav.language"), icon: Globe, current: currentPage === "language", page: "language" },
    { name: t("nav.settings"), icon: Settings, current: currentPage === "settings", page: "settings" },
  ];

  return (
    <div className="flex h-screen flex-col bg-black md:border-r md:border-gray-800">
      <div className="px-6 py-5">
        <TwitterLogo size="lg" className="mx-auto text-white md:mx-0" />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <button
                onClick={() => onNavigate?.(item.page)}
                title={item.name}
                className={`flex w-full items-center justify-center gap-4 rounded-full px-4 py-2.5 text-xl transition-colors duration-150 md:justify-start md:py-3 ${
                  item.current
                    ? "bg-white/10 font-bold text-white"
                    : "font-normal text-white hover:bg-gray-900"
                }`}
              >
                <item.icon
                  className={`h-7 w-7 shrink-0 ${
                    item.current ? "text-blue-400" : "text-gray-300"
                  }`}
                />
                <span className="hidden md:inline">{item.name}</span>
                {item.badge && unreadCount > 0 && (
                  <span className="ml-auto hidden h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-xs font-semibold text-white md:flex">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-3 px-2 md:mt-8">
          <Link
            href="/pricing"
            title={t("nav.premium")}
            className="flex w-full items-center justify-center gap-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2.5 text-lg font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] md:justify-start"
          >
            <Crown className="h-6 w-6 shrink-0" />
            <span className="hidden md:inline">{t("nav.premium")}</span>
          </Link>
          <button
            onClick={() => onNavigate?.("home")}
            title={t("nav.post")}
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white transition-all hover:bg-blue-600 active:scale-[0.98] md:h-auto md:w-full md:rounded-full md:py-3"
          >
            <span className="md:hidden">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </span>
            <span className="hidden md:inline">{t("nav.post")}</span>
          </button>
        </div>
      </nav>

      {user && (
        <div className="border-t border-gray-800 p-4">
          <button
            onClick={toggleTheme}
            title={
              theme === "dark"
                ? t("theme.toggleToLight")
                : t("theme.toggleToDark")
            }
            aria-label={
              theme === "dark"
                ? t("theme.toggleToLight")
                : t("theme.toggleToDark")
            }
            className="mb-2 flex w-full items-center gap-3 rounded-full p-2 text-left transition-colors hover:bg-gray-900"
          >
            {theme === "dark" ? (
              <Sun className="h-6 w-6 shrink-0 text-gray-300" />
            ) : (
              <Moon className="h-6 w-6 shrink-0 text-gray-300" />
            )}
            <span className="hidden truncate text-[15px] text-gray-300 md:inline">
              {theme === "dark"
                ? t("theme.toggleToLight")
                : t("theme.toggleToDark")}
            </span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-full p-2 text-left transition-colors hover:bg-gray-900">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={user.avatar} alt={user.displayName} />
                  <AvatarFallback>
                    {user.displayName?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold text-white">
                    {user.displayName}
                  </div>
                  <div className="truncate text-sm text-gray-400">
                    @{user.username}
                  </div>
                </div>
                <span className="hidden rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-400 md:block">
                  {t(`pricing.plans.${user.plan || "free"}.name`)}
                </span>
                <MoreHorizontal className="h-5 w-5 shrink-0 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60 bg-black border-gray-800">
              <DropdownMenuItem
                className="text-white hover:bg-gray-900"
                onClick={() => onNavigate?.("profile")}
              >
                <User className="mr-2 h-4 w-4" />
                {t("nav.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-white hover:bg-gray-900"
                onClick={() => onNavigate?.("settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                {t("sidebar.settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem
                className="text-white hover:bg-gray-900"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("sidebar.logOut", { username: user.username })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
