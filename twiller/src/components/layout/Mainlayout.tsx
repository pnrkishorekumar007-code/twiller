"use client";
import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";
import LoadingSpinner from "../loading-spinner";
import Sidebar from "./Sidebar";
import RightSidebar from "./Rightsidebar";
import ProfilePage from "../ProfilePage";
import ExplorePage from "../ExplorePage";
import BookmarksPage from "../BookmarksPage";
import { Construction } from "lucide-react";

const Mainlayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState("home");

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

  return (
    <div className="flex min-h-screen justify-center bg-black text-white">
      <div className="sticky top-0 h-screen w-20 sm:w-24 lg:w-64">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      </div>
      <main className="min-h-screen flex-1 max-w-2xl border-x border-gray-800">
        {currentPage === "profile" ? (
          <ProfilePage />
        ) : currentPage === "home" ? (
          children
        ) : currentPage === "explore" ? (
          <ExplorePage />
        ) : currentPage === "bookmarks" ? (
          <BookmarksPage />
        ) : (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <Construction className="mx-auto mb-4 h-12 w-12 text-gray-700" />
              <h2 className="mb-2 text-2xl font-bold text-white">
                {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
              </h2>
              <p className="text-gray-400">
                This page is under construction.
              </p>
            </div>
          </div>
        )}
      </main>
      <div className="hidden lg:block w-80">
        <RightSidebar />
      </div>
    </div>
  );
};

export default Mainlayout;
