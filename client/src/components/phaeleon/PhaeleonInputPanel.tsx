import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, Pill, Search, X } from "lucide-react";
import { PhaeleonDrugSelectBlock } from "@/components/phaeleon/PhaeleonDrugCards";
import {
  PhaeleonPanelHeader,
  PhaeleonPanelSection,
  phaeleonPanel,
} from "@/components/phaeleon/phaeleonPanelChrome";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PHAELEON_SEARCH_FOCUS_EVENT, usePhaeleon } from "@/contexts/PhaeleonContext";
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

export default function PhaeleonInputPanel() {
  const { t } = useTranslation("phaeleon");
  const {
    activeSlot,
    setActiveSlot,
    drug1,
    drug2,
    searchQuery,
    setSearchQuery,
    searchHits,
    localSearchHits,
    recentSearches,
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
  } = usePhaeleon();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedHitIndex, setSelectedHitIndex] = useState(0);

  useEffect(() => {
    const focusSearch = () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };
    window.addEventListener(PHAELEON_SEARCH_FOCUS_EVENT, focusSearch);
    return () => window.removeEventListener(PHAELEON_SEARCH_FOCUS_EVENT, focusSearch);
  }, []);

  useEffect(() => {
    setSelectedHitIndex(0);
  }, [searchQuery, searchHits.length]);

  const displayHits = searchHits.length > 0 ? searchHits : localSearchHits;
  const showLocalOnly = !searchLoading && searchHits.length === 0 && localSearchHits.length > 0;

  const analyzeState: AnalyzeButtonState = analysisLoading
    ? "loading"
    : !canAnalyze
      ? "disabled"
      : analysis
        ? "done"
        : "ready";

  const analyzeTooltip =
    analyzeState === "disabled"
      ? t("analyze.hint")
      : analyzeState === "done"
        ? t("analyze.doneHint")
        : t("analyze.readyHint");

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

  const selectSlot = (slot: "drug1" | "drug2") => {
    setActiveSlot(slot);
    setInspectorSlot(slot);
  };

  const activeSlotLabel = activeSlot === "drug1" ? t("drugA") : t("drugB");

  return (
    <aside className={cn(phaeleonPanel.shell, "min-w-0 overflow-hidden")}>
      <PhaeleonPanelHeader kicker={t("panels.input.kicker")} title={t("panels.input.title")} />

      <PhaeleonPanelSection label={t("input.drugSelect")} className="space-y-2">
        <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">
          {t("input.typingInto", { slot: activeSlotLabel })}
        </p>
        <PhaeleonDrugSelectBlock
          slot="drug1"
          label={t("drugA")}
          drug={drug1}
          selected={activeSlot === "drug1"}
          onSelect={selectSlot}
        />
        <PhaeleonDrugSelectBlock
          slot="drug2"
          label={t("drugB")}
          drug={drug2}
          selected={activeSlot === "drug2"}
          onSelect={selectSlot}
        />
      </PhaeleonPanelSection>

      <form onSubmit={handleSubmit} className={phaeleonPanel.section}>
        <label className={cn(phaeleonPanel.sectionLabel, "mb-1.5 block")} htmlFor="phaeleon-fda-search">
          {t("search.label")}
        </label>
        <div className="flex gap-2">
          <input
            id="phaeleon-fda-search"
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
            {t("search.action")}
          </button>
        </div>
        {searchQuery.trim() ? (
          <p className="mt-1.5 font-mono text-[9px] text-muted-foreground" aria-live="polite">
            {searchLoading
              ? t("search.loading")
              : showLocalOnly
                ? t("search.localOnly", { count: localSearchHits.length })
                : t("search.resultCount", { count: displayHits.length })}
          </p>
        ) : null}
      </form>

      <div className={phaeleonPanel.body}>
        {pendingDrugAssign ? (
          <div className={cn(phaeleonPanel.boxActive, "mb-3 space-y-2")} role="dialog" aria-labelledby="phaeleon-assign-title">
            <p id="phaeleon-assign-title" className="text-xs leading-relaxed">
              {t("input.confirmAssign", {
                drug: pendingDrugAssign.hit.name,
                slot: pendingDrugAssign.slot === "drug1" ? t("drugA") : t("drugB"),
              })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmDrugAssign}
                className={cn(
                  phaeleonPanel.control,
                  "flex flex-1 items-center justify-center gap-1 text-xs text-accent hover:border-accent",
                )}
              >
                <Check size={12} />
                {t("input.confirmAction")}
              </button>
              <button
                type="button"
                onClick={cancelDrugAssign}
                className={cn(
                  phaeleonPanel.control,
                  "flex flex-1 items-center justify-center gap-1 text-xs hover:border-muted-foreground",
                )}
              >
                <X size={12} />
                {t("input.cancelAction")}
              </button>
            </div>
          </div>
        ) : null}

        {searchError && displayHits.length === 0 ? (
          <p className="text-xs text-destructive" role="alert">
            {searchError === "noResults" ? t("search.noResults") : searchError}
          </p>
        ) : displayHits.length === 0 ? (
          searchQuery.trim() ? (
            <p className="text-xs text-muted-foreground">{t("search.typeToSearch")}</p>
          ) : recentSearches.length > 0 ? (
            <div>
              <p className={cn(phaeleonPanel.sectionLabel, "mb-2")}>{t("search.recent")}</p>
              <ul className="space-y-1">
                {recentSearches.map((query) => (
                  <li key={query}>
                    <button
                      type="button"
                      onClick={() => setSearchQuery(query)}
                      className={cn(phaeleonPanel.box, "w-full px-2 py-2 text-left text-xs hover:border-accent")}
                    >
                      {query}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        ) : (
          <ul className="space-y-1">
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
                  {hit.genericNames[0] && hit.genericNames[0] !== hit.name ? (
                    <span className="mt-0.5 block text-muted-foreground">{hit.genericNames[0]}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={phaeleonPanel.footer}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled={analyzeState === "disabled" || analyzeState === "loading"}
              onClick={() => void runAnalysis()}
              aria-busy={analyzeState === "loading"}
              className={cn(
                "flex w-full items-center justify-center gap-2 border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:hover:bg-transparent",
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
              {analyzeState === "loading"
                ? t("panels.analysis.loading")
                : t("analyze.action")}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{analyzeTooltip}</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
