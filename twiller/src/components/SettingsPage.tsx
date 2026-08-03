"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronRight,
  Globe,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNav } from "@/context/NavContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "./ui/button";

export default function SettingsPage() {
  const { user } = useAuth();
  const { goBack, openPage } = useNav();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const rows = [
    {
      key: "language",
      icon: Globe,
      onClick: () => openPage("language"),
    },
    {
      key: "loginActivity",
      icon: ShieldCheck,
      onClick: () => openPage("login-activity"),
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-black/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center space-x-8">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2 transition-colors hover:bg-gray-900"
            onClick={goBack}
            aria-label={t("settings.back")}
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <h1 className="text-xl font-bold text-white">{t("settings.title")}</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="mb-6">
          <h2 className="mb-1 text-lg font-bold text-white">
            {t("settings.theme")}
          </h2>
          <p className="mb-3 text-sm text-gray-500">{t("settings.themeDesc")}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
              className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 px-4 py-5 transition-colors ${
                theme === "dark"
                  ? "border-blue-500 bg-gray-900/60"
                  : "border-gray-800 hover:bg-gray-900/40"
              }`}
            >
              <Moon className="h-7 w-7 text-gray-300" />
              <span
                className={`text-sm font-semibold ${
                  theme === "dark" ? "text-blue-400" : "text-gray-300"
                }`}
              >
                {t("settings.themeDark")}
              </span>
            </button>
            <button
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
              className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 px-4 py-5 transition-colors ${
                theme === "light"
                  ? "border-blue-500 bg-gray-900/60"
                  : "border-gray-800 hover:bg-gray-900/40"
              }`}
            >
              <Sun className="h-7 w-7 text-gray-300" />
              <span
                className={`text-sm font-semibold ${
                  theme === "light" ? "text-blue-400" : "text-gray-300"
                }`}
              >
                {t("settings.themeLight")}
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <button
                key={row.key}
                onClick={row.onClick}
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-gray-900/60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-800">
                    <Icon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-white">
                      {t(`settings.${row.key}`)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t(`settings.${row.key}Desc`)}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          @{user?.username}
        </p>
      </div>
    </div>
  );
}
