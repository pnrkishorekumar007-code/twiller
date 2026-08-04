"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface Props {
  error: Error | null;
  onRetry: () => void;
}

export default function ErrorBoundaryFallback({ error, onRetry }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[300px] items-center justify-center p-8">
      <Card className="max-w-md w-full border-red-800 bg-red-900/20">
        <CardContent className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-800 bg-red-900/30">
            <AlertCircle className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-white">
            {t("errorBoundary.somethingWentWrong")}
          </h2>
          <p className="mb-4 text-sm text-gray-400">
            {t("errorBoundary.tryRefresh")}
          </p>
          {error && process.env.NODE_ENV === "development" && (
            <details className="mb-4 text-left text-xs text-gray-500">
              <summary className="cursor-pointer mb-1">
                {t("errorBoundary.errorDetails")}
              </summary>
              <pre className="rounded bg-gray-900 p-2 overflow-auto">
                {error.toString()}
              </pre>
            </details>
          )}
          <Button
            onClick={onRetry}
            className="w-full rounded-full bg-red-500 text-white hover:bg-red-600"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("errorBoundary.refreshPage")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}