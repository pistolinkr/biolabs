import type { DrugProfile, InteractionAnalysis } from "./types";

export function isFdaProfileSparse(profile: DrugProfile | null): boolean {
  if (!profile) return true;
  if (profile.source === "none") return true;
  return !profile.summary && !profile.indications && !profile.warnings && !profile.purpose;
}

export function formatDrugProfileForAi(label: string, profile: DrugProfile | null): string {
  if (!profile) return `${label}: no profile loaded`;
  const lines = [
    `${label}: ${profile.name}`,
    `source=${profile.source}`,
    profile.category ? `class=${profile.category}` : null,
    profile.route ? `route=${profile.route}` : null,
    profile.summary ? `summary(EN): ${profile.summary}` : null,
    profile.indications ? `indications(EN): ${profile.indications}` : null,
    profile.warnings ? `warnings(EN): ${profile.warnings}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function needsInteractionResearch(
  drug1Profile: DrugProfile | null,
  drug2Profile: DrugProfile | null,
  analysis: InteractionAnalysis | null,
): boolean {
  if (isFdaProfileSparse(drug1Profile) || isFdaProfileSparse(drug2Profile)) return true;
  if (!analysis) return false;
  if (analysis.risk === "unknown") return true;
  if (analysis.mechanism.includes("Limited structured interaction data")) return true;
  return false;
}
