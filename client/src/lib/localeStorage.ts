import {
  DEFAULT_UI_LOCALE,
  UI_LOCALE_STORAGE_KEY,
  isUiLocalePreference,
  localeToHtmlLang,
  resolveUiLocale,
  type LocaleStorageValue,
  type SupportedUiLocale,
  type UiLocalePreference,
} from "@shared/i18n/locales";

export const DEFAULT_LOCALE_STORAGE: LocaleStorageValue = {
  uiLocale: "auto",
};

export function loadLocalePreference(): LocaleStorageValue {
  if (typeof window === "undefined") return { ...DEFAULT_LOCALE_STORAGE };
  try {
    const raw = localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LOCALE_STORAGE };
    const parsed = JSON.parse(raw) as Partial<LocaleStorageValue>;
    return {
      uiLocale: isUiLocalePreference(parsed.uiLocale) ? parsed.uiLocale : "auto",
    };
  } catch {
    return { ...DEFAULT_LOCALE_STORAGE };
  }
}

export function saveLocalePreference(value: LocaleStorageValue): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function getResolvedUiLocale(preference?: UiLocalePreference): SupportedUiLocale {
  const pref = preference ?? loadLocalePreference().uiLocale;
  return resolveUiLocale(pref);
}

export function applyHtmlLang(locale: SupportedUiLocale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = localeToHtmlLang(locale);
}
