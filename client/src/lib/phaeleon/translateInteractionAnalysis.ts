import type { AiProviderId } from "@shared/ai/types";
import type { SupportedUiLocale } from "@shared/i18n/locales";
import { completeWithClientKeys } from "@/lib/ai/clientProviders";
import { hasAnyClientKey, type AiClientApiKeys } from "@/lib/ai/aiKeysStorage";
import type { InteractionAnalysis } from "./types";

const STORAGE_KEY = "biolabs.phaeleon.analysisTranslation.v2";

const LOCALE_LABELS: Record<SupportedUiLocale, string> = {
  en: "English",
  ko: "Korean",
  ja: "Japanese",
  zh: "Simplified Chinese",
  de: "German",
  fr: "French",
  es: "Spanish",
};

export type TranslatedAnalysisFields = Pick<
  InteractionAnalysis,
  "summary" | "mechanism" | "expectedEffects" | "practicalSteps" | "emergencySigns"
>;

function analysisTranslationKey(analysis: InteractionAnalysis, locale: SupportedUiLocale): string {
  return [
    locale,
    analysis.drug1,
    analysis.drug2,
    analysis.risk,
    analysis.summary,
    analysis.mechanism,
    analysis.expectedEffects.join("|"),
    analysis.practicalSteps.join("|"),
    analysis.emergencySigns.join("|"),
  ].join("::");
}

function loadCache(): Record<string, TranslatedAnalysisFields> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, TranslatedAnalysisFields>;
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, TranslatedAnalysisFields>): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* quota */
  }
}

export function readCachedAnalysisTranslation(
  analysis: InteractionAnalysis,
  locale: SupportedUiLocale,
): TranslatedAnalysisFields | null {
  if (locale === "en") return null;
  const cache = loadCache();
  const cached = cache[analysisTranslationKey(analysis, locale)] ?? null;
  if (!cached) return null;

  const source = analysisFieldsFromReport(analysis);
  if (!isLikelyTranslated(cached, source, locale)) {
    delete cache[analysisTranslationKey(analysis, locale)];
    saveCache(cache);
    return null;
  }

  return cached;
}

function localeScriptPattern(locale: SupportedUiLocale): RegExp | null {
  switch (locale) {
    case "ko":
      return /[가-힣]/;
    case "ja":
      return /[\u3040-\u30ff]/;
    case "zh":
      return /[\u4e00-\u9fff]/;
    default:
      return null;
  }
}

function isLikelyTranslated(
  translated: TranslatedAnalysisFields,
  source: TranslatedAnalysisFields,
  locale: SupportedUiLocale,
): boolean {
  const combined = [translated.summary, translated.mechanism, ...translated.expectedEffects].join(" ");
  const pattern = localeScriptPattern(locale);
  if (pattern) return pattern.test(combined);

  return (
    translated.summary.trim() !== source.summary.trim() ||
    translated.mechanism.trim() !== source.mechanism.trim()
  );
}

function writeCachedAnalysisTranslation(
  analysis: InteractionAnalysis,
  locale: SupportedUiLocale,
  translated: TranslatedAnalysisFields,
): void {
  const cache = loadCache();
  cache[analysisTranslationKey(analysis, locale)] = translated;
  saveCache(cache);
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function parseTranslatedFields(raw: string): TranslatedAnalysisFields {
  const parsed = JSON.parse(stripJsonFence(raw)) as Partial<TranslatedAnalysisFields>;
  const pickStrings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];

  if (typeof parsed.summary !== "string" || typeof parsed.mechanism !== "string") {
    throw new Error("Invalid translation payload");
  }

  return {
    summary: parsed.summary.trim(),
    mechanism: parsed.mechanism.trim(),
    expectedEffects: pickStrings(parsed.expectedEffects),
    practicalSteps: pickStrings(parsed.practicalSteps),
    emergencySigns: pickStrings(parsed.emergencySigns),
  };
}

export function mergeTranslatedAnalysis(
  base: InteractionAnalysis,
  translated: TranslatedAnalysisFields,
): InteractionAnalysis {
  return {
    ...base,
    ...translated,
  };
}

function analysisFieldsFromReport(analysis: InteractionAnalysis): TranslatedAnalysisFields {
  return {
    summary: analysis.summary,
    mechanism: analysis.mechanism,
    expectedEffects: analysis.expectedEffects,
    practicalSteps: analysis.practicalSteps,
    emergencySigns: analysis.emergencySigns,
  };
}

function finalizeTranslatedFields(
  analysis: InteractionAnalysis,
  targetLocale: SupportedUiLocale,
  translated: TranslatedAnalysisFields,
): InteractionAnalysis {
  const source = analysisFieldsFromReport(analysis);
  const merged: TranslatedAnalysisFields = {
    summary: translated.summary,
    mechanism: translated.mechanism,
    expectedEffects:
      translated.expectedEffects.length > 0 ? translated.expectedEffects : analysis.expectedEffects,
    practicalSteps:
      translated.practicalSteps.length > 0 ? translated.practicalSteps : analysis.practicalSteps,
    emergencySigns:
      translated.emergencySigns.length > 0 ? translated.emergencySigns : analysis.emergencySigns,
  };

  if (!isLikelyTranslated(merged, source, targetLocale)) {
    throw new Error("Translation did not produce localized text");
  }

  writeCachedAnalysisTranslation(analysis, targetLocale, merged);
  return mergeTranslatedAnalysis(analysis, merged);
}

async function translateViaServer(
  analysis: InteractionAnalysis,
  targetLocale: SupportedUiLocale,
): Promise<InteractionAnalysis> {
  const fields = analysisFieldsFromReport(analysis);
  const res = await fetch("/api/phaeleon/translate/analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale: targetLocale, ...fields }),
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Server translation unavailable (${res.status})`);
  }

  const payload = (await res.json()) as { translated?: TranslatedAnalysisFields; error?: string };
  if (!res.ok) {
    throw new Error(payload.error ?? `Server translation failed (${res.status})`);
  }
  if (!payload.translated) {
    throw new Error("Server translation returned empty payload");
  }

  return finalizeTranslatedFields(analysis, targetLocale, payload.translated);
}

export async function translateInteractionAnalysis(
  analysis: InteractionAnalysis,
  targetLocale: SupportedUiLocale,
  keys: AiClientApiKeys,
  preferredProvider: AiProviderId = "auto",
): Promise<InteractionAnalysis> {
  if (targetLocale === "en") return analysis;

  const cached = readCachedAnalysisTranslation(analysis, targetLocale);
  if (cached) return mergeTranslatedAnalysis(analysis, cached);

  const payload = JSON.stringify(analysisFieldsFromReport(analysis));
  const messages = [
    {
      role: "system" as const,
      content: [
        `Translate the drug interaction report JSON values into ${LOCALE_LABELS[targetLocale]} (${targetLocale}).`,
        "Return ONLY valid JSON with the exact same keys.",
        "Keep international drug names unchanged; you may add local names in parentheses.",
        "Use clear clinical-education language appropriate for patients and students.",
      ].join(" "),
    },
    { role: "user", content: payload },
  ];

  if (hasAnyClientKey(keys)) {
    try {
      const result = await completeWithClientKeys({
        messages,
        keys,
        preferred: preferredProvider,
        maxOutputTokens: 2048,
        temperature: 0.1,
      });
      const translated = parseTranslatedFields(result.text);
      return finalizeTranslatedFields(analysis, targetLocale, translated);
    } catch {
      /* fall through to server */
    }
  }

  return translateViaServer(analysis, targetLocale);
}
