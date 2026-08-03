"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Globe } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNav } from "@/context/NavContext";
import { Button } from "./ui/button";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";
import LanguageOtpModal from "./LanguageOtpModal";

export default function LanguageSettingsPage() {
  const { user } = useAuth();
  const { goBack } = useNav();
  const { t } = useTranslation();
  const [pendingLang, setPendingLang] = useState<string | null>(null);

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
          <h1 className="text-xl font-bold text-white">
            {t("language.title")}
          </h1>
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="mb-4 text-sm text-gray-500">{t("language.subtitle")}</p>

        <div className="space-y-1">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isCurrent = lang.code === user?.language;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  if (!isCurrent) setPendingLang(lang.code);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-gray-900/60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-800">
                    <Globe className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-white">
                      {lang.name}
                    </p>
                  </div>
                </div>
                {isCurrent && <Check className="h-5 w-5 text-blue-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {pendingLang && (
        <LanguageOtpModal
          targetLanguage={pendingLang}
          onClose={() => setPendingLang(null)}
        />
      )}
    </div>
  );
}
