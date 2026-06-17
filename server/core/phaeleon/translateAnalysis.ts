import type { SupportedUiLocale } from "@shared/i18n/locales";
import { translateStringsWithGoogle, translateTextWithGoogle } from "./googleTranslate.ts";

export type AnalysisTranslationFields = {
  summary: string;
  mechanism: string;
  expectedEffects: string[];
  practicalSteps: string[];
  emergencySigns: string[];
};

export function isServerAnalysisTranslationAvailable(): boolean {
  return true;
}

export async function translateAnalysisFieldsOnServer(
  fields: AnalysisTranslationFields,
  targetLocale: SupportedUiLocale,
): Promise<AnalysisTranslationFields> {
  if (targetLocale === "en") return fields;

  const [summary, mechanism, expectedEffects, practicalSteps, emergencySigns] = await Promise.all([
    translateTextWithGoogle(fields.summary, targetLocale),
    translateTextWithGoogle(fields.mechanism, targetLocale),
    translateStringsWithGoogle(fields.expectedEffects, targetLocale),
    translateStringsWithGoogle(fields.practicalSteps, targetLocale),
    translateStringsWithGoogle(fields.emergencySigns, targetLocale),
  ]);

  return {
    summary,
    mechanism,
    expectedEffects: expectedEffects.length > 0 ? expectedEffects : fields.expectedEffects,
    practicalSteps: practicalSteps.length > 0 ? practicalSteps : fields.practicalSteps,
    emergencySigns: emergencySigns.length > 0 ? emergencySigns : fields.emergencySigns,
  };
}
