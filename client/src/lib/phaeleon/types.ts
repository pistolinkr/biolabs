export type InteractionRisk = "low" | "moderate" | "high" | "very_high" | "unknown";

export interface DrugSearchHit {
  name: string;
  genericNames: string[];
  brandNames: string[];
  relevanceScore: number;
}

export interface DrugSlot {
  name: string;
  genericNames: string[];
  brandNames: string[];
}

export interface DrugProfile {
  name: string;
  category: string | null;
  summary: string | null;
  purpose: string | null;
  indications: string | null;
  description: string | null;
  warnings: string | null;
  route: string | null;
  source: "local" | "fda" | "mixed" | "none";
}

export interface InteractionAnalysis {
  drug1: string;
  drug2: string;
  risk: InteractionRisk;
  riskLabel: string;
  summary: string;
  mechanism: string;
  expectedEffects: string[];
  practicalSteps: string[];
  emergencySigns: string[];
  markdown: string;
}

export interface FdaSearchResponse {
  hits: DrugSearchHit[];
  query: string;
}
