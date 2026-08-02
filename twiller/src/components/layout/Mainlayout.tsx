"use client";
import { useAuth } from "@/context/AuthContext";
import React, { useRef, useState } from "react";
import dynamic from "next/dynamic";
import LoadingSpinner from "../loading-spinner";
import Sidebar from "./Sidebar";
import RightSidebar from "./Rightsidebar";
import { NavProvider } from "@/context/NavContext";
import { useKeywordNotifications } from "@/hooks/useKeywordNotifications";

// Code-split every secondary page so the initial bundle only contains the
// feed, composer, and layout. Each page loads on first navigation.
const ProfilePage = dynamic(() => import("../ProfilePage"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});
const UserProfilePage = dynamic(() => import("../UserProfilePage"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});
const AudioTweetPage = dynamic(() => import("../AudioTweetPage"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});
const ExplorePage = dynamic(() => import("../ExplorePage"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});
const BookmarksPage = dynamic(() => import("../BookmarksPage"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});
const NotificationsPage = dynamic(() => import("../NotificationsPage"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});
const MessagesPage = dynamic(() => import("../MessagesPage"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});
const LoginActivityPage = dynamic(() => import("../LoginActivityPage"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});
const LanguageSettingsPage = dynamic(() => import("../LanguageSettingsPage"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});
const SettingsPage = dynamic(() => import("../SettingsPage"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

function PageSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="skeleton h-8 w-48 rounded-full" />
      <div className="skeleton h-24 w-full rounded-2xl" />
      <div className="skeleton h-24 w-full rounded-2xl" />
      <div className="skeleton h-24 w-full rounded-2xl" />
    </div>
  );
}

const Mainlayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  useKeywordNotifications();
  const [currentPage, setCurrentPage] = useState("home");
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const historyRef = useRef<
    Array<{ page: string; viewingUserId: string | null }>
  >([]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="mb-4 animate-pulse text-4xl font-bold text-white">
            X
          </div>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  const navigateTo = (page: string) => {
    historyRef.current.push({ page: currentPage, viewingUserId });
    if (page === "profile") setViewingUserId(null);
    setCurrentPage(page);
  };

  const openProfile = (userId: string) => {
    historyRef.current.push({ page: currentPage, viewingUserId });
    setViewingUserId(userId);
    setCurrentPage("profile");
  };

  const search = (q: string) => {
    historyRef.current.push({ page: currentPage, viewingUserId });
    setSearchQuery(q);
    setCurrentPage("explore");
  };

  const goBack = () => {
    const prev = historyRef.current.pop();
    if (prev) {
      setViewingUserId(prev.viewingUserId);
      setCurrentPage(prev.page);
    } else {
      setViewingUserId(null);
      setCurrentPage("home");
    }
  };

  const navValue = { openProfile, search, goBack, openPage: navigateTo };

  return (
    <NavProvider value={navValue}>
      <div className="flex min-h-screen justify-center bg-black text-white">
        <div className="sticky top-0 h-screen w-20 sm:w-24 lg:w-64">
          <Sidebar currentPage={currentPage} onNavigate={navigateTo} />
        </div>
        <main className="min-h-screen flex-1 max-w-2xl border-x border-gray-800">
          {currentPage === "profile" ? (
            viewingUserId && viewingUserId !== user._id ? (
              <UserProfilePage userId={viewingUserId} />
            ) : (
              <ProfilePage />
            )
          ) : currentPage === "audio" ? (
            <AudioTweetPage />
          ) : currentPage === "home" ? (
            children
          ) : currentPage === "explore" ? (
            <ExplorePage initialQuery={searchQuery} />
          ) : currentPage === "bookmarks" ? (
            <BookmarksPage />
          ) : currentPage === "notifications" ? (
            <NotificationsPage />
          ) : currentPage === "messages" ? (
            <MessagesPage />
          ) : currentPage === "login-activity" ? (
            <LoginActivityPage />
          ) : currentPage === "language" ? (
            <LanguageSettingsPage />
          ) : currentPage === "settings" ? (
            <SettingsPage />
          ) : (
            children
          )}
        </main>
        <div className="hidden lg:block w-80">
          <RightSidebar />
        </div>
      </div>
    </NavProvider>
  );
};

export default Mainlayout;
