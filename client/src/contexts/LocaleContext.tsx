import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  SUPPORTED_UI_LOCALES,
  UI_LOCALE_LABELS,
  resolveUiLocale,
  type SupportedUiLocale,
  type UiLocalePreference,
} from "@shared/i18n/locales";
import { changeUiLanguage, i18n } from "@/i18n";
import {
  applyHtmlLang,
  getResolvedUiLocale,
  loadLocalePreference,
  saveLocalePreference,
} from "@/lib/localeStorage";

interface LocaleContextValue {
  uiLocale: UiLocalePreference;
  resolvedLocale: SupportedUiLocale;
  setUiLocale: (locale: UiLocalePreference) => Promise<void>;
  localeLabels: typeof UI_LOCALE_LABELS;
  supportedLocales: readonly SupportedUiLocale[];
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [uiLocale, setUiLocaleState] = useState<UiLocalePreference>(() => loadLocalePreference().uiLocale);
  const [resolvedLocale, setResolvedLocale] = useState<SupportedUiLocale>(() => getResolvedUiLocale());

  const setUiLocale = useCallback(async (next: UiLocalePreference) => {
    saveLocalePreference({ uiLocale: next });
    setUiLocaleState(next);
    const resolved = resolveUiLocale(next);
    await changeUiLanguage(resolved);
    setResolvedLocale(resolved);
    applyHtmlLang(resolved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved = getResolvedUiLocale(uiLocale);
      if (i18n.language !== resolved) {
        await changeUiLanguage(resolved);
      }
      if (!cancelled) {
        setResolvedLocale(resolved);
        applyHtmlLang(resolved);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uiLocale]);

  // Re-resolve when browser/OS language changes while preference is `auto`.
  useEffect(() => {
    if (uiLocale !== "auto") return;
    const syncAutoLocale = () => {
      void (async () => {
        const resolved = getResolvedUiLocale("auto");
        await changeUiLanguage(resolved);
        setResolvedLocale(resolved);
        applyHtmlLang(resolved);
      })();
    };
    window.addEventListener("languagechange", syncAutoLocale);
    return () => window.removeEventListener("languagechange", syncAutoLocale);
  }, [uiLocale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      uiLocale,
      resolvedLocale,
      setUiLocale,
      localeLabels: UI_LOCALE_LABELS,
      supportedLocales: SUPPORTED_UI_LOCALES,
    }),
    [uiLocale, resolvedLocale, setUiLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
