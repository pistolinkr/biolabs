import { useMemo } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePhaeleon } from "@/contexts/PhaeleonContext";
import {
  isPhaeleonReportSectionHref,
  scrollToPhaeleonReportSection,
} from "@/lib/phaeleon/reportSections";

export function usePhaeleonAssistantChatConfig() {
  const { t } = useTranslation("phaeleon");
  const { drug1, drug2, analysis, assistantPairContextPinned, dismissAssistantPairContext } = usePhaeleon();
  const pairReady = Boolean(drug1 && drug2);
  const pairContextActive = pairReady && assistantPairContextPinned;

  const contextBadge = pairContextActive ? (
    <span className="inline-flex max-w-full items-center gap-1 border border-accent/40 bg-accent/10 py-1 pl-2 pr-1 font-mono text-[9px] text-accent">
      <span className="min-w-0 truncate">
        [{drug1!.name} × {drug2!.name}] {t("assistant.contextBadge")}
      </span>
      <button
        type="button"
        onClick={dismissAssistantPairContext}
        className="flex shrink-0 items-center justify-center bg-transparent p-0.5 text-accent/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={t("assistant.dismissPairContext")}
      >
        <X className="size-3" strokeWidth={2} />
      </button>
    </span>
  ) : null;

  const quickPrompts = useMemo(() => {
    if (!pairContextActive) return [];
    const drugA = drug1!.name;
    const drugB = drug2!.name;
    const risk = analysis?.risk ?? "unknown";
    return [
      {
        id: "explainRisk",
        label: t("assistant.promptLabels.explainRisk"),
        prompt: t("assistant.prompts.explainRisk", { drugA, drugB, risk: t(`risk.${risk}`) }),
      },
      {
        id: "clinicalSummary",
        label: t("assistant.promptLabels.clinicalSummary"),
        prompt: t("assistant.prompts.clinicalSummary", { drugA, drugB }),
      },
      {
        id: "monitoring",
        label: t("assistant.promptLabels.monitoring"),
        prompt: t("assistant.prompts.monitoring", { drugA, drugB }),
      },
      {
        id: "alternatives",
        label: t("assistant.promptLabels.alternatives"),
        prompt: t("assistant.prompts.alternatives", { drugA, drugB }),
      },
      {
        id: "emergency",
        label: t("assistant.sectionLinks.emergency"),
        prompt: t("assistant.prompts.emergencySigns", { drugA, drugB }),
      },
    ];
  }, [pairContextActive, drug1, drug2, analysis, t]);

  const onAnchorClick = (href: string) => {
    if (isPhaeleonReportSectionHref(href)) {
      return scrollToPhaeleonReportSection(href.slice(1));
    }
    return false;
  };

  return {
    pairReady,
    pairContextActive,
    contextBadge,
    quickPrompts,
    onAnchorClick,
  };
}
