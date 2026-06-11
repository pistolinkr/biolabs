import {
  inferLocaleFromTimezone,
  localeToHtmlLang,
  resolveUiLocale,
  type SupportedUiLocale,
  type UiLocalePreference,
} from "@shared/i18n/locales";
import { loadLocalePreference } from "@/lib/localeStorage";

/** Apply `<html lang>` as early as possible (before React/i18n init). */
export function bootstrapDocumentLocale(preference?: UiLocalePreference): SupportedUiLocale {
  const pref = preference ?? loadLocalePreference().uiLocale;
  const resolved = resolveUiLocale(pref);
  if (typeof document !== "undefined") {
    document.documentElement.lang = localeToHtmlLang(resolved);
  }
  return resolved;
}

export { inferLocaleFromTimezone, resolveUiLocale };
