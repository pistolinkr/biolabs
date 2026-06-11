import type { SupportedUiLocale } from "@shared/i18n/locales";

/** Relative time for residue analysis history (locale-aware). */
export function formatBeforeTime(iso: string, locale: SupportedUiLocale): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const ms = Date.now() - then;
  const sec = Math.floor(ms / 1000);
  if (sec < 45) return relativeUnit(locale, "second", -sec);
  const min = Math.floor(sec / 60);
  if (min < 60) return relativeUnit(locale, "minute", -min);
  const hr = Math.floor(min / 60);
  if (hr < 24) return relativeUnit(locale, "hour", -hr);
  const day = Math.floor(hr / 24);
  if (day < 7) return relativeUnit(locale, "day", -day);
  return new Date(iso).toLocaleDateString(locale === "zh" ? "zh-Hans" : locale, {
    month: "short",
    day: "numeric",
  });
}

function relativeUnit(locale: SupportedUiLocale, unit: Intl.RelativeTimeFormatUnit, value: number): string {
  try {
    const tag = locale === "zh" ? "zh-Hans" : locale;
    return new Intl.RelativeTimeFormat(tag, { numeric: "auto" }).format(value, unit);
  } catch {
    if (unit === "second" && value >= -45) return "just now";
    return `${Math.abs(value)}${unit[0]} ago`;
  }
}

export function formatNumber(value: number, locale: SupportedUiLocale): string {
  const tag = locale === "zh" ? "zh-Hans" : locale;
  return value.toLocaleString(tag);
}
