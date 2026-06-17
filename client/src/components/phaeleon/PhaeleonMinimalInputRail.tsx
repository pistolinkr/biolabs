import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pill,
  Search,
  X,
} from "lucide-react";
import { PhaeleonDrugSelectBlock } from "@/components/phaeleon/PhaeleonDrugCards";
import PhaeleonDrugExplainPopover from "@/components/phaeleon/PhaeleonDrugExplainPopover";
import PhaeleonInteractionRiskMark from "@/components/phaeleon/PhaeleonInteractionRiskMark";
import { phaeleonPanel } from "@/components/phaeleon/phaeleonPanelChrome";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAssistant } from "@/contexts/AssistantContext";
import { PHAELEON_SEARCH_FOCUS_EVENT, usePhaeleon, type HelixDrugSlot } from "@/contexts/PhaeleonContext";
import { usePhaeleonDrugExplainPrefetch } from "@/hooks/usePhaeleonDrugExplainPrefetch";
import { isBinaryLayout } from "@/lib/phaeleon/phaeleonLayoutMode";
import { cn } from "@/lib/utils";

type AnalyzeButtonState = "disabled" | "ready" | "loading" | "done";

function analyzeButtonClass(state: AnalyzeButtonState): string {
  switch (state) {
    case "ready":
      return "border-accent bg-accent/10 text-accent hover:bg-accent hover:text-background";
    case "loading":
      return "border-accent/70 bg-accent/5 text-accent";
    case "done":
      return "border-border bg-secondary text-foreground hover:border-accent hover:text-accent";
    default:
      return "border-border text-muted-foreground";
  }
}

interface PhaeleonMinimalInputRailProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onExpand: () => void;
}

export default function PhaeleonMinimalInputRail({
  collapsed,
  onToggleCollapse,
  onExpand,
}: PhaeleonMinimalInputRailProps) {
  const { t } = useTranslation("phaeleon");
  const {
    activeSlot,
    setActiveSlot,
    drug1,
    drug2,
    drug1Profile,
    drug2Profile,
    searchQuery,
    setSearchQuery,
    searchHits,
    localSearchHits,
    searchLoading,
    searchError,
    runSearch,
    requestDrugAssign,
    pendingDrugAssign,
    confirmDrugAssign,
    cancelDrugAssign,
    setInspectorSlot,
    canAnalyze,
    analysis,
    analysisLoading,
    runAnalysis,
    settings,
  } = usePhaeleon();
  const { aiConfigured } = useAssistant();
  usePhaeleonDrugExplainPrefetch();
  const binaryLayout = isBinaryLayout(settings);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const drug1AnchorRef = useRef<HTMLButtonElement>(null);
  const drug2AnchorRef = useRef<HTMLButtonElement>(null);
  const [selectedHitIndex, setSelectedHitIndex] = useState(0);
  const [explainSlot, setExplainSlot] = useState<HelixDrugSlot | null>(null);

  useEffect(() => {
    const focusSearch = () => {
      if (collapsed) onExpand();
      window.setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 120);
    };
    window.addEventListener(PHAELEON_SEARCH_FOCUS_EVENT, focusSearch);
    return () => window.removeEventListener(PHAELEON_SEARCH_FOCUS_EVENT, focusSearch);
  }, [collapsed, onExpand]);

  useEffect(() => {
    setSelectedHitIndex(0);
  }, [searchQuery, searchHits.length]);

  const displayHits = searchHits.length > 0 ? searchHits : localSearchHits;
  const showLocalOnly = !searchLoading && searchHits.length === 0 && localSearchHits.length > 0;

  const analyzeState: AnalyzeButtonState = analysisLoading
    ? "loading"
    : !canAnalyze || !aiConfigured
      ? "disabled"
      : analysis
        ? "done"
        : "ready";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (displayHits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedHitIndex((i) => (i + 1) % displayHits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedHitIndex((i) => (i === 0 ? displayHits.length - 1 : i - 1));
    } else if (e.key === "Enter" && displayHits[selectedHitIndex]) {
      e.preventDefault();
      requestDrugAssign(displayHits[selectedHitIndex]!);
    }
  };

  const selectSlot = (slot: HelixDrugSlot) => {
    setActiveSlot(slot);
    setInspectorSlot(slot);
  };

  const handleSlotPress = (slot: HelixDrugSlot) => {
    const drug = slot === "drug1" ? drug1 : drug2;
    if (drug) {
      setExplainSlot((prev) => (prev === slot ? null : slot));
      return;
    }
    selectSlot(slot);
    if (collapsed) onExpand();
  };

  const explainDrug = explainSlot === "drug1" ? drug1 : explainSlot === "drug2" ? drug2 : null;
  const explainProfile = explainSlot === "drug1" ? drug1Profile : explainSlot === "drug2" ? drug2Profile : null;
  const explainLabel = explainSlot === "drug1" ? t("drugA") : explainSlot === "drug2" ? t("drugB") : "";

  const explainAnchorRef = explainSlot === "drug1" ? drug1AnchorRef : explainSlot === "drug2" ? drug2AnchorRef : drug1AnchorRef;

  const explainPopover = (
    <PhaeleonDrugExplainPopover
      open={explainSlot !== null}
      onClose={() => setExplainSlot(null)}
      anchorRef={explainAnchorRef}
      slotLabel={explainLabel}
      drug={explainDrug}
      profile={explainProfile}
    />
  );

  const searchBlock = (
    <>
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className={cn(phaeleonPanel.sectionLabel, "block")} htmlFor="phaeleon-fda-search-min">
          {t("search.label")}
        </label>
        <div className="flex gap-2">
          <input
            id="phaeleon-fda-search-min"
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t("search.placeholder")}
            className={cn(phaeleonPanel.control, "min-w-0 flex-1 text-sm")}
          />
          <button
            type="submit"
            disabled={searchLoading}
            className={cn(
              phaeleonPanel.control,
              "flex shrink-0 items-center gap-1 text-xs transition-colors hover:border-accent hover:text-accent disabled:opacity-50",
            )}
          >
            <Search size={12} />
          </button>
        </div>
        {searchQuery.trim() ? (
          <p className="font-mono text-[9px] text-muted-foreground" aria-live="polite">
            {searchLoading
              ? t("search.loading")
              : showLocalOnly
                ? t("search.localOnly", { count: localSearchHits.length })
                : t("search.resultCount", { count: displayHits.length })}
          </p>
        ) : null}
      </form>

      {pendingDrugAssign ? (
        <div className={cn(phaeleonPanel.boxActive, "space-y-2")} role="dialog">
          <p className="text-xs leading-relaxed">
            {t("input.confirmAssign", {
              drug: pendingDrugAssign.hit.name,
              slot: pendingDrugAssign.slot === "drug1" ? t("drugA") : t("drugB"),
            })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmDrugAssign}
              className={cn(phaeleonPanel.control, "flex flex-1 items-center justify-center gap-1 text-xs text-accent")}
            >
              <Check size={12} />
              {t("input.confirmAction")}
            </button>
            <button
              type="button"
              onClick={cancelDrugAssign}
              className={cn(phaeleonPanel.control, "flex flex-1 items-center justify-center gap-1 text-xs")}
            >
              <X size={12} />
              {t("input.cancelAction")}
            </button>
          </div>
        </div>
      ) : null}

      {searchError && displayHits.length === 0 && !binaryLayout ? (
        <p className="text-xs text-destructive" role="alert">
          {searchError === "noResults" ? t("search.noResults") : searchError}
        </p>
      ) : displayHits.length > 0 ? (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {displayHits.map((hit, idx) => (
            <li key={`${hit.name}-${idx}`}>
              <button
                type="button"
                onClick={() => requestDrugAssign(hit)}
                className={cn(
                  phaeleonPanel.box,
                  "w-full px-2 py-2 text-left text-xs hover:border-accent",
                  idx === selectedHitIndex && phaeleonPanel.boxActive,
                )}
              >
                <span className="font-medium">{hit.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : searchQuery.trim() ? (
        <p className="text-xs text-muted-foreground">{t("search.typeToSearch")}</p>
      ) : null}
    </>
  );

  if (collapsed) {
    return (
      <>
        <aside className="flex h-full w-full flex-col items-center gap-2 border-r border-border/60 bg-card/50 py-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            title={t("assistantFirst.expandInput")}
            className="flex size-8 items-center justify-center border border-border text-muted-foreground hover:border-accent hover:text-accent"
          >
            <ChevronRight size={14} />
          </button>
          <button
            ref={drug1AnchorRef}
            type="button"
            onClick={() => handleSlotPress("drug1")}
            title={drug1 ? t("inputRail.drugExplainTitle", { drug: drug1.name }) : t("drugA")}
            className={cn(
              "flex size-8 items-center justify-center border text-[10px] font-mono",
              drug1 ? "border-accent/50 text-accent" : "border-border text-muted-foreground",
              activeSlot === "drug1" && "ring-1 ring-accent",
            )}
          >
            A
          </button>
          <button
            ref={drug2AnchorRef}
            type="button"
            onClick={() => handleSlotPress("drug2")}
            title={drug2 ? t("inputRail.drugExplainTitle", { drug: drug2.name }) : t("drugB")}
            className={cn(
              "flex size-8 items-center justify-center border text-[10px] font-mono",
              drug2 ? "border-accent/50 text-accent" : "border-border text-muted-foreground",
              activeSlot === "drug2" && "ring-1 ring-accent",
            )}
          >
            B
          </button>
          {binaryLayout && analysis ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="flex size-8 items-center justify-center"
                  tabIndex={0}
                  aria-label={t("inputRail.interactionRisk", { risk: analysis.riskLabel })}
                >
                  <PhaeleonInteractionRiskMark risk={analysis.risk} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">{analysis.riskLabel}</TooltipContent>
            </Tooltip>
          ) : null}
        </aside>
        {explainPopover}
      </>
    );
  }

  return (
    <>
      <aside className="flex h-full min-w-0 flex-col overflow-hidden border-r border-border/60 bg-card/50">
        <div className="flex items-center justify-between border-b border-border/60 px-2 py-2">
          <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            {t("drugA")}/{t("drugB")}
          </span>
          <button
            type="button"
            onClick={onToggleCollapse}
            title={t("assistantFirst.collapseInput")}
            className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={14} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <PhaeleonDrugSelectBlock
            slot="drug1"
            label={t("drugA")}
            drug={drug1}
            selected={activeSlot === "drug1"}
            onSelect={handleSlotPress}
            buttonRef={drug1AnchorRef}
          />
          <PhaeleonDrugSelectBlock
            slot="drug2"
            label={t("drugB")}
            drug={drug2}
            selected={activeSlot === "drug2"}
            onSelect={handleSlotPress}
            buttonRef={drug2AnchorRef}
          />
          {binaryLayout && analysis ? (
            <div className="flex justify-center pt-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex items-center justify-center"
                    tabIndex={0}
                    aria-label={t("inputRail.interactionRisk", { risk: analysis.riskLabel })}
                  >
                    <PhaeleonInteractionRiskMark risk={analysis.risk} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right">{analysis.riskLabel}</TooltipContent>
              </Tooltip>
            </div>
          ) : null}
          {searchBlock}
        </div>

        <div className="shrink-0 border-t border-border/60 p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={analyzeState === "disabled" || analyzeState === "loading"}
                onClick={() => void runAnalysis()}
                aria-busy={analyzeState === "loading"}
                className={cn(
                  "flex w-full items-center justify-center gap-2 border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed",
                  analyzeButtonClass(analyzeState),
                )}
              >
                {analyzeState === "loading" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : analyzeState === "done" ? (
                  <Check size={14} />
                ) : (
                  <Pill size={14} />
                )}
                {analyzeState === "loading" ? t("panels.analysis.loading") : t("analyze.action")}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("analyze.readyHint")}</TooltipContent>
          </Tooltip>
        </div>
      </aside>
      {explainPopover}
    </>
  );
}
