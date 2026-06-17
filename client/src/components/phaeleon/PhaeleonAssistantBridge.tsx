import { useEffect, useMemo } from "react";
import { useAssistant } from "@/contexts/AssistantContext";
import { useLocale } from "@/contexts/LocaleContext";
import { usePhaeleon } from "@/contexts/PhaeleonContext";
import type { PhaeleonAgentExecutorDeps } from "@/lib/phaeleon/phaeleonAgentActions";
import { buildPhaeleonAssistantContext } from "@/lib/phaeleon/phaeleonAssistantContext";
import type { PhaeleonCommandHandlers } from "@/lib/phaeleon/phaeleonCommands";
import { PHAELEON_REPORT_SECTIONS, scrollToPhaeleonReportSection } from "@/lib/phaeleon/reportSections";
import type { PhaeleonReportSectionKey } from "@shared/ai/types";
import { i18n } from "@/i18n";

function focusPhaeleonAssistantDock() {
  document.getElementById("phaeleon-assistant-dock")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  document
    .querySelector<HTMLTextAreaElement | HTMLInputElement>(
      "#phaeleon-assistant-dock textarea, #phaeleon-assistant-dock input[type='text']",
    )
    ?.focus();
}

/** Injects Phaeleon workstation + drug-pair context into shared AI assistant requests. */
export default function PhaeleonAssistantBridge() {
  const phaeleon = usePhaeleon();
  const {
    drug1,
    drug2,
    drug1Profile,
    drug2Profile,
    analysis,
    displayAnalysis,
    interactionResearch,
    settings,
    activeSlot,
    searchQuery,
    searchHits,
    searchLoading,
    canAnalyze,
    assistantPairContextPinned,
    setSearchQuery,
    runSearch,
    assignDrugToSlot,
    getAgentSnapshot,
    setActiveSlot,
    clearDrug,
    swapDrugs,
    setInspectorSlot,
    runAnalysis,
    clearSession,
    setLayoutPreset,
    resetLayoutToPreset,
    updateSettings,
  } = phaeleon;
  const { resolvedLocale } = useLocale();
  const { registerContextExtension, registerPhaeleonAgentDeps } = useAssistant();

  const commandHandlers = useMemo<PhaeleonCommandHandlers>(
    () => ({
      runAnalysis,
      clearSession,
      swapDrugs,
      setActiveSlot,
      updateSettings,
      settings,
      setLayoutPreset,
      resetLayoutToPreset,
      focusAssistantDock: focusPhaeleonAssistantDock,
    }),
    [
      runAnalysis,
      clearSession,
      swapDrugs,
      setActiveSlot,
      updateSettings,
      settings,
      setLayoutPreset,
      resetLayoutToPreset,
    ],
  );

  useEffect(() => {
    const reportPending = resolvedLocale !== "en" && Boolean(analysis) && !displayAnalysis;
    const report = reportPending ? null : resolvedLocale === "en" ? displayAnalysis ?? analysis : displayAnalysis;

    const bundle = buildPhaeleonAssistantContext({
      drug1,
      drug2,
      drug1Profile,
      drug2Profile,
      analysis: report,
      interactionResearch,
      uiLocale: resolvedLocale,
      layoutPreset: settings.layoutPreset,
      layoutStructure: settings.layoutStructure,
      activeSlot,
      searchQuery,
      searchHits,
      canAnalyze,
      includePairContext: assistantPairContextPinned,
    });

    return registerContextExtension({
      workstation_id: "phaeleon",
      ui_locale: resolvedLocale,
      domain:
        drug1 && drug2 && assistantPairContextPinned ? "phaeleon_drug_interaction" : "phaeleon",
      input_drafts: bundle.input_drafts,
      platform_generated_analysis: bundle.platform_generated_analysis,
      annotations: bundle.annotations,
    });
  }, [
    drug1,
    drug2,
    drug1Profile,
    drug2Profile,
    analysis,
    displayAnalysis,
    interactionResearch,
    resolvedLocale,
    settings.layoutPreset,
    settings.layoutStructure,
    activeSlot,
    searchQuery,
    searchHits,
    canAnalyze,
    assistantPairContextPinned,
    registerContextExtension,
  ]);

  useEffect(() => {
    const deps: PhaeleonAgentExecutorDeps = {
      getState: getAgentSnapshot,
      setSearchQuery,
      runSearch,
      assignDrugToSlot,
      setActiveSlot,
      clearDrug,
      swapDrugs,
      setInspectorSlot,
      runAnalysis,
      clearSession,
      commandHandlers,
      scrollReportSection: (section: PhaeleonReportSectionKey) =>
        scrollToPhaeleonReportSection(PHAELEON_REPORT_SECTIONS[section]),
      t: (key, opts) => i18n.t(key, { ns: "assistant", ...opts }),
    };

    return registerPhaeleonAgentDeps(deps);
  }, [
    setSearchQuery,
    runSearch,
    assignDrugToSlot,
    getAgentSnapshot,
    setActiveSlot,
    clearDrug,
    swapDrugs,
    setInspectorSlot,
    runAnalysis,
    clearSession,
    commandHandlers,
    registerPhaeleonAgentDeps,
  ]);

  return null;
}
