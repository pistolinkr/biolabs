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

export type AiInteractionAnalysisPayload = {
  risk: string;
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

function pickStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export function parseAiInteractionAnalysisPayload(raw: string): AiInteractionAnalysisPayload {
  const parsed = JSON.parse(stripJsonFence(raw)) as Partial<AiInteractionAnalysisPayload>;
  if (typeof parsed.summary !== "string" || typeof parsed.mechanism !== "string") {
    throw new Error("Invalid AI analysis payload");
  }

  const risk = typeof parsed.risk === "string" ? parsed.risk.trim().toLowerCase() : "unknown";

  return {
    risk,
    summary: parsed.summary.trim(),
    mechanism: parsed.mechanism.trim(),
    expectedEffects: pickStrings(parsed.expectedEffects),
    practicalSteps: pickStrings(parsed.practicalSteps),
    emergencySigns: pickStrings(parsed.emergencySigns),
  };
}

export function isServerAiAnalysisAvailable(): boolean {
  return resolveActiveProvider(loadAiConfig()) !== null;
}

export async function generateInteractionAnalysisOnServer(
  drug1: string,
  drug2: string,
  targetLocale: SupportedUiLocale,
): Promise<AiInteractionAnalysisPayload> {
  const messages: AiChatMessage[] = [
    {
      role: "system",
      content: [
        "You are a clinical pharmacology educator producing a structured drug-drug interaction (DDI) assessment.",
        `Write ALL text field values in ${LOCALE_LABELS[targetLocale]} (${targetLocale}).`,
        "Use established pharmacology and clinical interaction knowledge only — do NOT claim FDA label verification.",
        "Return ONLY valid JSON with keys: risk, summary, mechanism, expectedEffects, practicalSteps, emergencySigns.",
        "risk must be one of: low, moderate, high, very_high, unknown.",
        "Each array field must contain 2–5 concise strings.",
        "Educational use only — be conservative when evidence is limited.",
      ].join(" "),
    },
    {
      role: "user",
      content: `Assess the drug-drug interaction between "${drug1}" and "${drug2}".`,
    },
  ];

  const result = await completeWithProvider(messages, {
    maxOutputTokens: 2048,
    temperature: 0.25,
  });

  return parseAiInteractionAnalysisPayload(result.text);
}
