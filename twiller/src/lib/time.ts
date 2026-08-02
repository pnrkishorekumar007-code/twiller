import i18n from "@/i18n/config";

export function timeAgo(ts: string | Date | undefined | null) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return i18n.t("time.now");
  if (mins < 60) return i18n.t("time.minutes", { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return i18n.t("time.hours", { count: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 7) return i18n.t("time.days", { count: days });
  return new Date(ts).toLocaleDateString(i18n.language, {
    month: "short",
    day: "numeric",
  });
}
