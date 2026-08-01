"use client";
import { useAuth } from "@/context/AuthContext";
import React, { useRef, useState } from "react";
import LoadingSpinner from "../loading-spinner";
import Sidebar from "./Sidebar";
import RightSidebar from "./Rightsidebar";
import ProfilePage from "../ProfilePage";
import ExplorePage from "../ExplorePage";
import BookmarksPage from "../BookmarksPage";
import NotificationsPage from "../NotificationsPage";
import MessagesPage from "../MessagesPage";
import UserProfilePage from "../UserProfilePage";
import { NavProvider } from "@/context/NavContext";
import { useKeywordNotifications } from "@/hooks/useKeywordNotifications";

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

  const navValue = { openProfile, search, goBack };

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
