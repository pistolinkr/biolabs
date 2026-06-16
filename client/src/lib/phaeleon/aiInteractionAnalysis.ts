import type { AiProviderId } from "@shared/ai/types";
import type { SupportedUiLocale } from "@shared/i18n/locales";
import { completeWithClientKeys } from "@/lib/ai/clientProviders";
import { hasAnyClientKey, type AiClientApiKeys } from "@/lib/ai/aiKeysStorage";
import type { InteractionAnalysis, InteractionRisk } from "./types";

const LOCALE_LABELS: Record<SupportedUiLocale, string> = {
  en: "English",
  ko: "Korean",
  ja: "Japanese",
  zh: "Simplified Chinese",
  de: "German",
  fr: "French",
  es: "Spanish",
};

const VALID_RISKS = new Set<InteractionRisk>(["low", "moderate", "high", "very_high", "unknown"]);

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function pickStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function normalizeRisk(raw: unknown): InteractionRisk {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "unknown";
  return VALID_RISKS.has(value as InteractionRisk) ? (value as InteractionRisk) : "unknown";
}

function riskLabel(risk: InteractionRisk): string {
  switch (risk) {
    case "high":
      return "High";
    case "very_high":
      return "Very High";
    case "moderate":
      return "Moderate";
    case "low":
      return "Low";
    default:
      return "Unknown";
  }
}

function buildMarkdown(analysis: Omit<InteractionAnalysis, "markdown">): string {
  return [
    `**${analysis.drug1} + ${analysis.drug2}**`,
    "",
    `**Risk:** ${analysis.riskLabel}`,
    "",
    analysis.summary,
    "",
    analysis.mechanism,
    "",
    "**Expected effects**",
    ...analysis.expectedEffects.map((e) => `- ${e}`),
    "",
    "**Practical steps**",
    ...analysis.practicalSteps.map((s) => `- ${s}`),
    "",
    "**Emergency signs**",
    ...analysis.emergencySigns.map((s) => `- ${s}`),
  ].join("\n");
}

function payloadToAnalysis(
  drug1: string,
  drug2: string,
  payload: {
    risk: string;
    summary: string;
    mechanism: string;
    expectedEffects: string[];
    practicalSteps: string[];
    emergencySigns: string[];
  },
): InteractionAnalysis {
  const risk = normalizeRisk(payload.risk);
  const core = {
    drug1,
    drug2,
    risk,
    riskLabel: riskLabel(risk),
    summary: payload.summary.trim(),
    mechanism: payload.mechanism.trim(),
    expectedEffects: payload.expectedEffects,
    practicalSteps: payload.practicalSteps,
    emergencySigns: payload.emergencySigns,
  };
  return { ...core, markdown: buildMarkdown(core) };
}

function parseAiPayload(raw: string): {
  risk: string;
  summary: string;
  mechanism: string;
  expectedEffects: string[];
  practicalSteps: string[];
  emergencySigns: string[];
} {
  const parsed = JSON.parse(stripJsonFence(raw)) as Record<string, unknown>;
  if (typeof parsed.summary !== "string" || typeof parsed.mechanism !== "string") {
    throw new Error("Invalid AI analysis payload");
  }
  return {
    risk: typeof parsed.risk === "string" ? parsed.risk : "unknown",
    summary: parsed.summary,
    mechanism: parsed.mechanism,
    expectedEffects: pickStrings(parsed.expectedEffects),
    practicalSteps: pickStrings(parsed.practicalSteps),
    emergencySigns: pickStrings(parsed.emergencySigns),
  };
}

function buildPromptMessages(drug1: string, drug2: string, locale: SupportedUiLocale) {
  return [
    {
      role: "system" as const,
      content: [
        "You are a clinical pharmacology educator producing a structured drug-drug interaction (DDI) assessment.",
        `Write ALL text field values in ${LOCALE_LABELS[locale]} (${locale}).`,
        "Use established pharmacology and clinical interaction knowledge only — do NOT claim FDA label verification.",
        "Return ONLY valid JSON with keys: risk, summary, mechanism, expectedEffects, practicalSteps, emergencySigns.",
        "risk must be one of: low, moderate, high, very_high, unknown.",
        "Each array field must contain 2–5 concise strings.",
        "Educational use only — be conservative when evidence is limited.",
      ].join(" "),
    },
    {
      role: "user" as const,
      content: `Assess the drug-drug interaction between "${drug1}" and "${drug2}".`,
    },
  ];
}

async function generateViaServer(
  drug1: string,
  drug2: string,
  locale: SupportedUiLocale,
): Promise<InteractionAnalysis> {
  const res = await fetch("/api/phaeleon/analyze/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drug1, drug2, locale }),
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Server AI analysis unavailable (${res.status})`);
  }

  const payload = (await res.json()) as { analysis?: ReturnType<typeof parseAiPayload>; error?: string };
  if (!res.ok) {
    throw new Error(payload.error ?? `Server AI analysis failed (${res.status})`);
  }
  if (!payload.analysis) {
    throw new Error("Server AI analysis returned empty payload");
  }

  return payloadToAnalysis(drug1, drug2, payload.analysis);
}

export function isAiInteractionAnalysisAvailable(keys: AiClientApiKeys): boolean {
  return hasAnyClientKey(keys);
}

export async function checkServerAiAnalysisAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/api/phaeleon/analyze/status");
    if (!res.ok) return false;
    const payload = (await res.json()) as { available?: boolean };
    return payload.available === true;
  } catch {
    return false;
  }
}

export async function generateAiInteractionAnalysis(
  drug1: string,
  drug2: string,
  locale: SupportedUiLocale,
  keys: AiClientApiKeys,
  preferredProvider: AiProviderId = "auto",
): Promise<InteractionAnalysis> {
  const messages = buildPromptMessages(drug1, drug2, locale);

  if (hasAnyClientKey(keys)) {
    try {
      const result = await completeWithClientKeys({
        messages,
        keys,
        preferred: preferredProvider,
        maxOutputTokens: 2048,
        temperature: 0.25,
      });
      const payload = parseAiPayload(result.text);
      return payloadToAnalysis(drug1, drug2, payload);
    } catch {
      /* fall through to server */
    }
  }

  return generateViaServer(drug1, drug2, locale);
}
