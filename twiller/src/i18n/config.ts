import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import hi from "./locales/hi.json";
import pt from "./locales/pt.json";
import zh from "./locales/zh.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "hi", name: "हिन्दी" },
  { code: "pt", name: "Português" },
  { code: "zh", name: "中文" },
  { code: "fr", name: "Français" },
];

export const DEFAULT_LANGUAGE = "en";

export function isSupportedLanguage(lang?: string | null): lang is string {
  return !!lang && SUPPORTED_LANGUAGES.some((l) => l.code === lang);
}

export function applyLanguage(lang?: string | null) {
  const code = isSupportedLanguage(lang) ? (lang as string) : DEFAULT_LANGUAGE;
  i18n.changeLanguage(code);
  if (typeof document !== "undefined") {
    document.documentElement.lang = code;
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      hi: { translation: hi },
      pt: { translation: pt },
      zh: { translation: zh },
    },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    returnEmptyString: true,
  });
}

export default i18n;
