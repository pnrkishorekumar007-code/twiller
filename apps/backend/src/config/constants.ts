export const OTP_TTL_MS = 5 * 60 * 1000;
export const MAX_OTP_ATTEMPTS = 5;
export const OTP_GRANT_TTL_MS = 10 * 60 * 1000;
export const MAX_DURATION_SECONDS = 300;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const TWEET_PAGE_SIZE = 50;

export const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "hi",
  "pt",
  "ta",
  "zh",
  "fr",
] as const;

export const EMAIL_OTP_LANGUAGES = ["fr"] as const;

export const LANGUAGE_NAMES = {
  en: "English",
  es: "Español",
  hi: "हिन्दी",
  pt: "Português",
  ta: "தமிழ்",
  zh: "中文",
  fr: "Français",
} as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];