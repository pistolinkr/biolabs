import type { SupportedUiLocale } from "../i18n/locales";
import type { AiResponseLanguage } from "./types";

const FIXED_LANGUAGES: Exclude<AiResponseLanguage, "auto">[] = [
  "en",
  "ko",
  "ja",
  "zh",
  "de",
  "fr",
  "es",
];

export function isFixedAiResponseLanguage(v: unknown): v is Exclude<AiResponseLanguage, "auto"> {
  return typeof v === "string" && (FIXED_LANGUAGES as readonly string[]).includes(v);
}

/** Resolve AI output language: explicit setting wins; auto follows UI locale when known. */
export function resolveAiResponseLanguage(
  preference: AiResponseLanguage | undefined,
  uiLocale?: SupportedUiLocale | null,
): AiResponseLanguage {
  const pref = preference ?? "auto";
  if (pref !== "auto") return pref;
  if (uiLocale) return uiLocale;
  return "auto";
}
