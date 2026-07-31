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
import { PLAN_LABELS } from "@/lib/plans";

interface SidebarProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export default function Sidebar({
  currentPage = "home",
  onNavigate,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Home", icon: Home, current: currentPage === "home", page: "home" },
    { name: "Explore", icon: Search, current: currentPage === "explore", page: "explore" },
    { name: "Notifications", icon: Bell, current: currentPage === "notifications", page: "notifications", badge: true },
    { name: "Messages", icon: Mail, current: currentPage === "messages", page: "messages" },
    { name: "Bookmarks", icon: Bookmark, current: currentPage === "bookmarks", page: "bookmarks" },
    { name: "Profile", icon: User, current: currentPage === "profile", page: "profile" },
    { name: "More", icon: MoreHorizontal, current: currentPage === "more", page: "more" },
  ];

  return (
    <div className="flex h-screen flex-col border-r border-gray-800 bg-black">
      <div className="px-6 py-5">
        <TwitterLogo size="lg" className="mx-auto text-white md:mx-0" />
      </div>

      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <button
                onClick={() => onNavigate?.(item.page)}
                title={item.name}
                className={`flex w-full items-center justify-center gap-4 rounded-full px-4 py-3 text-xl transition-colors duration-150 md:justify-start ${
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
                {item.badge && (
                  <span className="ml-auto hidden h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white md:flex">
                    3
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-8 space-y-3 px-2">
          <Link
            href="/pricing"
            title="Premium"
            className="flex w-full items-center justify-center gap-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2.5 text-lg font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] md:justify-start"
          >
            <Crown className="h-6 w-6 shrink-0" />
            <span className="hidden md:inline">Premium</span>
          </Link>
          <button
            onClick={() => onNavigate?.("home")}
            title="Post"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white transition-all hover:bg-blue-600 active:scale-[0.98] md:h-auto md:w-full md:rounded-full md:py-3"
          >
            <span className="md:hidden">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </span>
            <span className="hidden md:inline">Post</span>
          </button>
        </div>
      </nav>

      {user && (
        <div className="border-t border-gray-800 p-4">
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
                  {PLAN_LABELS[user.plan || "free"]}
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
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white hover:bg-gray-900">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem
                className="text-white hover:bg-gray-900"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out @{user.username}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
