import type { SupportedUiLocale } from "@shared/i18n/locales";
import type { HelixDrugSlot } from "@/contexts/PhaeleonContext";
import { PHAELEON_REPORT_SECTIONS } from "./reportSections";
import type { PhaeleonLayoutStructure } from "./phaeleonLayoutPresets";
import {
  formatDrugProfileForAi,
  isFdaProfileSparse,
  needsInteractionResearch,
} from "./phaeleonProfileGaps";
import type { PhaeleonInteractionResearch } from "./phaeleonResearchApi";
import type { DrugProfile, DrugSearchHit, DrugSlot, InteractionAnalysis } from "./types";

export interface PhaeleonAssistantContextBundle {
  input_drafts: string | null;
  platform_generated_analysis: string | null;
  annotations: string;
}

function localeNeedsTranslation(locale: SupportedUiLocale): boolean {
  return locale !== "en";
}

function formatResearchBlock(research: PhaeleonInteractionResearch | null): string | null {
  if (!research || research.snippets.length === 0) return null;
  const lines = research.snippets.map((s) => `- ${s.title} (${s.url})`);
  return [`external_research source=${research.source} query="${research.query}"`, ...lines].join("\n");
}

function formatSearchHits(hits: DrugSearchHit[]): string {
  if (!hits.length) return "none";
  return hits
    .slice(0, 5)
    .map((h, i) => `${i}:${h.name}`)
    .join(", ");
}

export function buildPhaeleonAssistantContext(input: {
  drug1: DrugSlot | null;
  drug2: DrugSlot | null;
  drug1Profile: DrugProfile | null;
  drug2Profile: DrugProfile | null;
  analysis: InteractionAnalysis | null;
  interactionResearch: PhaeleonInteractionResearch | null;
  uiLocale: SupportedUiLocale;
  layoutPreset: string;
  layoutStructure: PhaeleonLayoutStructure;
  activeSlot?: HelixDrugSlot;
  searchQuery?: string;
  searchHits?: DrugSearchHit[];
  canAnalyze?: boolean;
  /** When false, omit drug-pair drafts, report, and FDA blocks from assistant context. */
  includePairContext?: boolean;
}): PhaeleonAssistantContextBundle {
  const {
    drug1,
    drug2,
    drug1Profile,
    drug2Profile,
    analysis,
    interactionResearch,
    uiLocale,
    layoutPreset,
    activeSlot = "drug1",
    searchQuery = "",
    searchHits = [],
    canAnalyze = false,
    includePairContext = true,
  } = input;

  if (!includePairContext) {
    return {
      input_drafts: null,
      platform_generated_analysis: null,
      annotations: [
        "Workstation: Phaeleon (/phaeleon) — Biolabs drug–drug interaction analysis",
        "Assistant pair context: dismissed by user — answer the question without assuming an active Drug A/B pair unless they mention drugs.",
        `layout_preset: ${layoutPreset}`,
        `user_ui_locale: ${uiLocale}`,
        "Disclaimer: educational only — not medical advice",
      ].join("\n"),
    };
  }

  const pairLine =
    drug1 && drug2
      ? `Active pair: ${drug1.name} + ${drug2.name}`
      : drug1 || drug2
        ? `Partial pair: Drug A=${drug1?.name ?? "—"}, Drug B=${drug2?.name ?? "—"}`
        : "No drug pair selected";

  const inputDraft =
    drug1 || drug2
      ? [`Drug A: ${drug1?.name ?? "—"}`, `Drug B: ${drug2?.name ?? "—"}`].join(" · ")
      : null;

  const fdaBlocks = [
    drug1 ? formatDrugProfileForAi("Drug A FDA/local profile", drug1Profile) : null,
    drug2 ? formatDrugProfileForAi("Drug B FDA/local profile", drug2Profile) : null,
  ].filter(Boolean);

  const fdaGaps = [
    drug1 && isFdaProfileSparse(drug1Profile) ? "drug_a_fda_sparse" : null,
    drug2 && isFdaProfileSparse(drug2Profile) ? "drug_b_fda_sparse" : null,
  ].filter(Boolean);

  const supplementRequired = drug1 && drug2 ? needsInteractionResearch(drug1Profile, drug2Profile, analysis) : false;

  const reportLang = localeNeedsTranslation(uiLocale) ? uiLocale : "en";

  const platformAnalysis = analysis
    ? [
        `Pair: ${analysis.drug1} + ${analysis.drug2}`,
        `Risk: ${analysis.riskLabel} (${analysis.risk})`,
        `Summary(${reportLang}): ${analysis.summary}`,
        `Mechanism(${reportLang}): ${analysis.mechanism}`,
        analysis.expectedEffects.length
          ? `Expected effects(${reportLang}): ${analysis.expectedEffects.slice(0, 6).join("; ")}`
          : null,
        analysis.practicalSteps.length
          ? `Practical steps(${reportLang}): ${analysis.practicalSteps.slice(0, 4).join("; ")}`
          : null,
        analysis.emergencySigns.length
          ? `Emergency signs(${reportLang}): ${analysis.emergencySigns.slice(0, 4).join("; ")}`
          : null,
        `Report anchors: emergency ${PHAELEON_REPORT_SECTIONS.emergency}, summary ${PHAELEON_REPORT_SECTIONS.summary}, mechanism ${PHAELEON_REPORT_SECTIONS.mechanism}`,
        localeNeedsTranslation(uiLocale)
          ? `User UI locale is ${uiLocale}. Prefer ${uiLocale} in replies; translate any remaining English FDA excerpts.`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : supplementRequired && drug1 && drug2
      ? [
          `No rule-based report yet for ${drug1.name} + ${drug2.name}.`,
          "FDA label data is sparse — provide an educational DDI assessment using pharmacology knowledge and external_research when available.",
          localeNeedsTranslation(uiLocale)
            ? `Respond in ${uiLocale}; translate any English FDA excerpts you cite.`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : null;

  const researchBlock = formatResearchBlock(interactionResearch);

  const annotations = [
    "Workstation: Phaeleon (/phaeleon) — Biolabs drug–drug interaction analysis",
    "Tool purpose: FDA label search, Drug A/B pairing, rule-based DDI reports, AI review with translation",
    `layout_preset: ${layoutPreset}`,
    `user_ui_locale: ${uiLocale}`,
    localeNeedsTranslation(uiLocale)
      ? "translate_fda_and_report: required — FDA labels and platform report text are English; translate for the user"
      : "translate_fda_and_report: not required (English UI)",
    `fda_gaps: ${fdaGaps.length > 0 ? fdaGaps.join(", ") : "none"}`,
    supplementRequired
      ? "supplement_with_knowledge_or_research: required"
      : "supplement_with_knowledge_or_research: optional",
    pairLine,
    `active_slot: ${activeSlot}`,
    `search_query: ${searchQuery || "none"}`,
    `search_hits: ${formatSearchHits(searchHits)}`,
    `can_analyze: ${canAnalyze ? "yes" : "no"}`,
    ...fdaBlocks,
    researchBlock,
    analysis
      ? `Rule-based assessment loaded · layout preset ${layoutPreset}`
      : supplementRequired
        ? "Sparse FDA data — assistant should synthesize interaction guidance"
        : "Run Analyze interaction after both drugs are assigned",
    "Disclaimer: educational only — not medical advice",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    input_drafts: inputDraft,
    platform_generated_analysis: platformAnalysis,
    annotations,
  };
}
