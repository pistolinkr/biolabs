import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAssistant } from "@/contexts/AssistantContext";
import { useLocale } from "@/contexts/LocaleContext";
import { usePhaeleon } from "@/contexts/PhaeleonContext";
import { isFdaProfileSparse } from "@/lib/phaeleon/phaeleonProfileGaps";
import { isBinaryLayout } from "@/lib/phaeleon/phaeleonLayoutMode";

/** Applies Phaeleon-specific AI side effects after analysis — never on empty state; Binary is user-triggered only. */
export default function PhaeleonAssistantEffects() {
  const {
    analysis,
    displayAnalysis,
    settings,
    drug1,
    drug2,
    drug1Profile,
    drug2Profile,
    interactionResearch,
  } = usePhaeleon();
  const { sendMessage, aiConfigured } = useAssistant();
  const { resolvedLocale } = useLocale();
  const { t } = useTranslation("phaeleon");
  const lastHandledKey = useRef<string | null>(null);

  useEffect(() => {
    if (!drug1 || !drug2) return;
    if (isBinaryLayout(settings)) return;
    const report = displayAnalysis ?? analysis;
    if (!report) return;
    const key = `${report.drug1}::${report.drug2}::${report.risk}`;
    if (lastHandledKey.current === key) return;
    lastHandledKey.current = key;

    if (settings.autoOpenChatOnAnalyze) {
      document.getElementById("phaeleon-assistant-dock")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      document.querySelector<HTMLTextAreaElement>("#phaeleon-assistant-dock textarea")?.focus();
    }

    if (settings.analysisMode !== "rules_and_ai" || !aiConfigured) return;

    const sparseFda = isFdaProfileSparse(drug1Profile) || isFdaProfileSparse(drug2Profile);
    const researchNote =
      interactionResearch && interactionResearch.snippets.length > 0
        ? `PubMed references available (${interactionResearch.snippets.length}).`
        : sparseFda
          ? "FDA labels are sparse — supplement with pharmacology knowledge."
          : "";

    const localeNote =
      resolvedLocale !== "en"
        ? `Respond in ${resolvedLocale}. Use the localized assessment below when answering.`
        : "Respond in English.";

    const prompt = [
      t("assistant.autoReviewIntro"),
      localeNote,
      researchNote,
      `Drug A: ${report.drug1}`,
      `Drug B: ${report.drug2}`,
      `Risk: ${report.riskLabel}`,
      report.summary,
      report.mechanism,
    ]
      .filter(Boolean)
      .join("\n");

    void sendMessage(prompt, "analysis");
  }, [
    analysis,
    displayAnalysis,
    drug1,
    drug2,
    drug1Profile,
    drug2Profile,
    interactionResearch,
    resolvedLocale,
    settings.autoOpenChatOnAnalyze,
    settings.analysisMode,
    settings,
    aiConfigured,
    sendMessage,
    t,
  ]);

  useEffect(() => {
    if (!drug1 || !drug2) {
      lastHandledKey.current = null;
    }
  }, [drug1, drug2]);

  return null;
}
