/** UI locale preference stored in client settings. */
export type UiLocalePreference = "auto" | SupportedUiLocale;

/** Resolved language codes with full translation bundles. */
export type SupportedUiLocale = "en" | "ko" | "ja" | "zh" | "de" | "fr" | "es";

export const DEFAULT_UI_LOCALE: SupportedUiLocale = "en";

export const UI_LOCALE_STORAGE_KEY = "biolabs.locale.v1";

export const SUPPORTED_UI_LOCALES: readonly SupportedUiLocale[] = [
  "en",
  "ko",
  "ja",
  "zh",
  "de",
  "fr",
  "es",
] as const;

/** BCP-47 prefixes mapped to supported UI locale. */
export const LOCALE_PREFIX_MAP: Record<string, SupportedUiLocale> = {
  en: "en",
  ko: "ko",
  ja: "ja",
  zh: "zh",
  de: "de",
  fr: "fr",
  es: "es",
};

export const UI_LOCALE_LABELS: Record<SupportedUiLocale, string> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
  zh: "中文 (简体)",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

export type I18nNamespace =
  | "common"
  | "settings"
  | "header"
  | "landing"
  | "viewport"
  | "assistant"
  | "workbench"
  | "commands"
  | "errors"
  | "workflow"
  | "phaeleon";

export const I18N_NAMESPACES: readonly I18nNamespace[] = [
  "common",
  "settings",
  "header",
  "landing",
  "viewport",
  "assistant",
  "workbench",
  "commands",
  "errors",
  "workflow",
  "phaeleon",
] as const;

export interface LocaleStorageValue {
  uiLocale: UiLocalePreference;
}

export function isSupportedUiLocale(v: unknown): v is SupportedUiLocale {
  return typeof v === "string" && (SUPPORTED_UI_LOCALES as readonly string[]).includes(v);
}

export function isUiLocalePreference(v: unknown): v is UiLocalePreference {
  return v === "auto" || isSupportedUiLocale(v);
}

/** Regional hints when browser languages are English-only (common with VPN testing). */
export const TIMEZONE_REGION_MAP: Record<string, { locale: SupportedUiLocale; regionCode: string }> = {
  "Asia/Tokyo": { locale: "ja", regionCode: "JP" },
  "Asia/Seoul": { locale: "ko", regionCode: "KR" },
  "Europe/Berlin": { locale: "de", regionCode: "DE" },
  "Europe/Vienna": { locale: "de", regionCode: "AT" },
  "Europe/Zurich": { locale: "de", regionCode: "CH" },
  "Europe/Paris": { locale: "fr", regionCode: "FR" },
  "Europe/Madrid": { locale: "es", regionCode: "ES" },
  "Europe/Rome": { locale: "es", regionCode: "IT" },
  "Asia/Shanghai": { locale: "zh", regionCode: "CN" },
  "Asia/Hong_Kong": { locale: "zh", regionCode: "HK" },
  "Asia/Taipei": { locale: "zh", regionCode: "TW" },
};

export interface RegionalLocaleInference {
  locale: SupportedUiLocale;
  timeZone: string;
  regionCode: string;
}

export function inferRegionalLocale(timeZone?: string): RegionalLocaleInference | null {
  let tz = timeZone;
  if (!tz && typeof Intl !== "undefined") {
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  }
  if (!tz) return null;
  const entry = TIMEZONE_REGION_MAP[tz];
  if (!entry) return null;
  return { locale: entry.locale, regionCode: entry.regionCode, timeZone: tz };
}

export function getRegionDisplayName(
  regionCode: string,
  displayLocale: SupportedUiLocale = DEFAULT_UI_LOCALE,
): string {
  try {
    const displayNames = new Intl.DisplayNames([localeToHtmlLang(displayLocale)], { type: "region" });
    return displayNames.of(regionCode) ?? regionCode;
  } catch {
    return regionCode;
  }
}

export function inferLocaleFromTimezone(timeZone?: string): SupportedUiLocale | null {
  return inferRegionalLocale(timeZone)?.locale ?? null;
}

function matchBrowserLanguageTag(raw: string): SupportedUiLocale | null {
  const tag = raw.toLowerCase().replace("_", "-");
  const primary = tag.split("-")[0];
  if (LOCALE_PREFIX_MAP[primary]) return LOCALE_PREFIX_MAP[primary];
  if (LOCALE_PREFIX_MAP[tag]) return LOCALE_PREFIX_MAP[tag];
  return null;
}

/** Collect browser language tags for `auto` resolution. Excludes `<html lang>` to avoid circular writes. */
export function collectBrowserLanguageTags(): string[] {
  if (typeof navigator === "undefined") return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  const add = (raw: string | undefined | null) => {
    if (!raw) return;
    const normalized = raw.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push(normalized);
  };
  for (const tag of navigator.languages ?? []) add(tag);
  add(navigator.language);
  try {
    add(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    /* Intl unavailable */
  }
  return tags;
}

/**
 * Resolve `auto` from browser languages, then English.
 * Regional timezone hints are offered separately via LocaleSuggestionBanner (user consent).
 */
export function resolveUiLocale(preference: UiLocalePreference, browserLanguages?: readonly string[]): SupportedUiLocale {
  if (preference !== "auto") return preference;
  const langs = browserLanguages ?? collectBrowserLanguageTags();

  for (const raw of langs) {
    const matched = matchBrowserLanguageTag(raw);
    if (matched && matched !== DEFAULT_UI_LOCALE) return matched;
  }

  return DEFAULT_UI_LOCALE;
}

/**
 * Timezone locale suggestion applies only when UI is `auto` and the browser
 * did not already resolve to a non-English locale (e.g. ja in navigator.languages).
 */
export function inferTimezoneLocaleSuggestion(
  uiLocale: UiLocalePreference,
  resolvedLocale: SupportedUiLocale,
  browserLanguages?: readonly string[],
): RegionalLocaleInference | null {
  if (uiLocale !== "auto") return null;

  const browserResolved = resolveUiLocale("auto", browserLanguages);
  if (browserResolved !== DEFAULT_UI_LOCALE) return null;

  const regional = inferRegionalLocale();
  if (!regional) return null;
  if (regional.locale === resolvedLocale) return null;
  return regional;
}

export function localeToHtmlLang(locale: SupportedUiLocale): string {
  switch (locale) {
    case "zh":
      return "zh-Hans";
    default:
      return locale;
  }
}
