import { isSupportedUiLocale, type SupportedUiLocale } from "@shared/i18n/locales";

const LOCALE_SUGGESTION_STORAGE_KEY = "biolabs.locale.suggestion.v1";

interface LocaleSuggestionStorageValue {
  dismissedLocales: SupportedUiLocale[];
}

const DEFAULT_STORAGE: LocaleSuggestionStorageValue = {
  dismissedLocales: [],
};

function loadStorage(): LocaleSuggestionStorageValue {
  if (typeof window === "undefined") return { ...DEFAULT_STORAGE };
  try {
    const raw = localStorage.getItem(LOCALE_SUGGESTION_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STORAGE };
    const parsed = JSON.parse(raw) as Partial<LocaleSuggestionStorageValue>;
    const dismissedLocales = Array.isArray(parsed.dismissedLocales)
      ? parsed.dismissedLocales.filter(isSupportedUiLocale)
      : [];
    return { dismissedLocales };
  } catch {
    return { ...DEFAULT_STORAGE };
  }
}

function saveStorage(value: LocaleSuggestionStorageValue): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALE_SUGGESTION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function isLocaleSuggestionDismissed(locale: SupportedUiLocale): boolean {
  return loadStorage().dismissedLocales.includes(locale);
}

export function dismissLocaleSuggestion(locale: SupportedUiLocale): void {
  const storage = loadStorage();
  if (storage.dismissedLocales.includes(locale)) return;
  saveStorage({ dismissedLocales: [...storage.dismissedLocales, locale] });
}
