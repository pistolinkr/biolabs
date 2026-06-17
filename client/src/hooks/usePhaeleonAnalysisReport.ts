import { useLocale } from "@/contexts/LocaleContext";
import { usePhaeleon } from "@/contexts/PhaeleonContext";
import type { InteractionAnalysis } from "@/lib/phaeleon/types";

export function usePhaeleonAnalysisReport() {
  const { resolvedLocale } = useLocale();
  const {
    drug1,
    drug2,
    analysis,
    displayAnalysis,
    analysisTranslationLoading,
    analysisTranslationReveal,
    analysisTranslationFailed,
    analysisLoading,
  } = usePhaeleon();

  const needsLocalizedReport = resolvedLocale !== "en" && Boolean(analysis);
  const initialAnalysisPending = analysisLoading && !analysis;
  const reportPending =
    initialAnalysisPending ||
    analysisTranslationLoading ||
    (needsLocalizedReport && !displayAnalysis && !analysis);
  const report: InteractionAnalysis | null = initialAnalysisPending ? null : displayAnalysis ?? analysis;
  const pairReady = Boolean(drug1 && drug2);
  const emptyMode: "none" | "noPair" | "awaitAnalysis" = !pairReady
    ? "noPair"
    : analysis
      ? "none"
      : "awaitAnalysis";
  const showLocalizedReveal = Boolean(report) && analysisTranslationReveal && resolvedLocale !== "en";

  return {
    drug1,
    drug2,
    analysis,
    report,
    reportPending,
    pairReady,
    emptyMode,
    showLocalizedReveal,
    analysisTranslationFailed,
    needsLocalizedReport,
    analysisLoading,
    initialAnalysisPending,
  };
}
