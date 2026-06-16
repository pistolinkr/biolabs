import type { AiChatMessage } from "@shared/ai/types";
import type { SupportedUiLocale } from "@shared/i18n/locales";
import { loadAiConfig, resolveActiveProvider } from "../ai/config.ts";
import { completeWithProvider } from "../ai/providerRouter.ts";

const LOCALE_LABELS: Record<SupportedUiLocale, string> = {
  en: "English",
  ko: "Korean",
  ja: "Japanese",
  zh: "Simplified Chinese",
  de: "German",
  fr: "French",
  es: "Spanish",
};

export type AnalysisTranslationFields = {
  summary: string;
  mechanism: string;
  expectedEffects: string[];
  practicalSteps: string[];
  emergencySigns: string[];
};

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function parseTranslatedFields(raw: string): AnalysisTranslationFields {
  const parsed = JSON.parse(stripJsonFence(raw)) as Partial<AnalysisTranslationFields>;
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

export function isServerAnalysisTranslationAvailable(): boolean {
  return resolveActiveProvider(loadAiConfig()) !== null;
}

export async function translateAnalysisFieldsOnServer(
  fields: AnalysisTranslationFields,
  targetLocale: SupportedUiLocale,
): Promise<AnalysisTranslationFields> {
  if (targetLocale === "en") return fields;

  const payload = JSON.stringify(fields);
  const messages: AiChatMessage[] = [
    {
      role: "system",
      content: [
        `Translate the drug interaction report JSON values into ${LOCALE_LABELS[targetLocale]} (${targetLocale}).`,
        "Return ONLY valid JSON with the exact same keys.",
        "Keep international drug names unchanged; you may add local names in parentheses.",
        "Use clear clinical-education language appropriate for patients and students.",
      ].join(" "),
    },
    { role: "user", content: payload },
  ];

  const result = await completeWithProvider(messages, {
    maxOutputTokens: 2048,
    temperature: 0.1,
  });

  const translated = parseTranslatedFields(result.text);
  return {
    summary: translated.summary,
    mechanism: translated.mechanism,
    expectedEffects:
      translated.expectedEffects.length > 0 ? translated.expectedEffects : fields.expectedEffects,
    practicalSteps:
      translated.practicalSteps.length > 0 ? translated.practicalSteps : fields.practicalSteps,
    emergencySigns:
      translated.emergencySigns.length > 0 ? translated.emergencySigns : fields.emergencySigns,
  };
}
