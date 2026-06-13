import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Loader2, Sparkles, X } from "lucide-react";
import { Streamdown } from "streamdown";
import FloatingPanelResizeHandles from "@/components/assistant/FloatingPanelResizeHandles";
import { useAssistant } from "@/contexts/AssistantContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useViewer, type ViewportPickAnchor } from "@/contexts/ViewerContext";
import { formatBeforeTime } from "@/i18n/format";
import { formatAiUserNotice } from "@/lib/ai/userErrors";
import {
  appendResidueAnalysisHistory,
  loadResidueAnalysisHistory,
  proteinKeyFromSelection,
  type ResidueAnalysisEntry,
} from "@/lib/ai/residueAnalysisHistory";
import {
  findLatestStructureEntry,
  loadStructureAnalysisHistory,
  type StructureAnalysisEntry,
} from "@/lib/ai/structureAnalysisHistory";
import { useFloatingPanelLayout } from "@/hooks/useFloatingPanelLayout";
import { cn } from "@/lib/utils";
import type { SupportedUiLocale } from "@shared/i18n/locales";

type PanelMode = "structure" | "residue";

const DEFAULT_W = 320;
const DEFAULT_H = 420;
const COLLAPSED_H = 88;

interface ActiveResidueAnalysis {
  entryId: string;
  residueKey: string;
  chain: string;
  resno: string;
  resname: string;
  prompt: string;
  phase: "loading" | "ready" | "error";
  content: string | null;
}

function findLatestEntryForResidue(
  entries: ResidueAnalysisEntry[],
  key: string,
): ResidueAnalysisEntry | null {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].residueKey === key) return entries[i];
  }
  return null;
}

function residueKeyFromParts(chain: string, resno: string | number): string {
  return `${chain}:${resno}`;
}

function anchorOrFallback(
  anchor: ViewportPickAnchor | null,
  container: DOMRectReadOnly | null,
): ViewportPickAnchor {
  if (anchor) return anchor;
  const w = container?.width ?? 640;
  const h = container?.height ?? 480;
  return { x: Math.round(w * 0.38), y: Math.round(h * 0.42) };
}

export default function ViewportAnalysisPanel() {
  const { t } = useTranslation("assistant");
  const { t: tc } = useTranslation("common");
  const { resolvedLocale } = useLocale();
  const {
    explain,
    isSending,
    status,
    aiSettings,
    structureAnalysis,
    closeStructureAnalysis,
    analyzeStructure,
  } = useAssistant();
  const {
    proteinSelection,
    viewportPickDetail,
    selectedResidueKey,
    viewportPickAnchor,
  } = useViewer();

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const structureActiveRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [residueHistory, setResidueHistory] = useState<ResidueAnalysisEntry[]>([]);
  const [structureHistory, setStructureHistory] = useState<StructureAnalysisEntry[]>([]);
  const [activeResidue, setActiveResidue] = useState<ActiveResidueAnalysis | null>(null);

  const showResidue = Boolean(
    aiSettings.showResidueExplainPopup &&
      proteinSelection &&
      (viewportPickDetail || selectedResidueKey),
  );
  const visible = Boolean(proteinSelection) && !dismissed;
  const mode: PanelMode = showResidue ? "residue" : "structure";
  const activeStructure = mode === "structure" ? structureAnalysis.active : null;

  const {
    position,
    setPosition,
    size,
    positionLocked,
    setPositionPinned,
    dragging,
    resizing,
    clampPanelPosition,
    setClampSize,
    dragHandleProps,
    getResizeHandleProps,
    reclampPosition,
  } = useFloatingPanelLayout(containerRef, {
    defaultSize: { width: DEFAULT_W, height: DEFAULT_H },
    minSize: { width: 220, height: COLLAPSED_H },
    maxSize: { width: 520, height: 560 },
    defaultPosition: { left: 16, top: 56 },
  });

  const proteinKey = proteinKeyFromSelection(proteinSelection);
  const analysisLabel = t("analysisLabel");

  const chain = viewportPickDetail?.chain ?? selectedResidueKey?.split(":")[0] ?? "?";
  const resno = String(viewportPickDetail?.resno ?? selectedResidueKey?.split(":")[1] ?? "?");
  const resname = viewportPickDetail?.resname ?? "residue";
  const residueKey = residueKeyFromParts(chain, resno);
  const residuePrompt = `Explain residue ${resname} ${chain}:${resno} in the currently loaded structure. Cover side-chain chemistry, typical roles, and local structural context using platform analysis data.`;

  const priorResidueHistory = useMemo(() => {
    if (!activeResidue) return residueHistory;
    return residueHistory.filter((e) => e.id !== activeResidue.entryId);
  }, [residueHistory, activeResidue]);

  const priorStructureHistory = useMemo(() => {
    if (!activeStructure) return structureHistory;
    return structureHistory.filter((e) => e.id !== activeStructure.entryId);
  }, [structureHistory, activeStructure]);

  const lastAnalysisForResidue = useMemo(
    () => findLatestEntryForResidue(residueHistory, residueKey),
    [residueHistory, residueKey],
  );

  const lastStructureAnalysis = useMemo(
    () => findLatestStructureEntry(structureHistory),
    [structureHistory],
  );

  const collapsedResidueMeta = useMemo(() => {
    if (mode !== "residue") return null;
    if (activeResidue?.phase === "loading") {
      return { label: t("analyzing"), tone: "active" as const };
    }
    if (lastAnalysisForResidue) {
      return {
        label: formatBeforeTime(lastAnalysisForResidue.createdAt, resolvedLocale),
        tone: lastAnalysisForResidue.error ? ("error" as const) : ("done" as const),
      };
    }
    return null;
  }, [activeResidue?.phase, lastAnalysisForResidue, mode, resolvedLocale, t]);

  const collapsedStructureMeta = useMemo(() => {
    if (mode !== "structure") return null;
    if (activeStructure?.phase === "loading") {
      return { label: t("structureAnalysis.analyzing"), tone: "active" as const };
    }
    if (lastStructureAnalysis) {
      return {
        label: formatBeforeTime(lastStructureAnalysis.createdAt, resolvedLocale),
        tone: lastStructureAnalysis.error ? ("error" as const) : ("done" as const),
      };
    }
    return null;
  }, [activeStructure?.phase, lastStructureAnalysis, mode, resolvedLocale, t]);

  const structureTitle =
    proteinSelection && proteinSelection.label.length > 48
      ? `${proteinSelection.label.slice(0, 45)}…`
      : (proteinSelection?.label ?? "");

  const roleLabel =
    mode === "structure" ? t("structureAnalysis.kicker") : t("residueAnalysis.kicker");

  const subjectLabel =
    mode === "structure"
      ? structureTitle
      : `${resname} · ${chain}:${resno}`;

  const panelSize = useMemo(
    () => ({
      width: size.width,
      height: expanded ? size.height : COLLAPSED_H,
    }),
    [expanded, size.height, size.width],
  );

  useEffect(() => {
    setClampSize(panelSize);
  }, [panelSize, setClampSize]);

  useEffect(() => {
    if (structureAnalysis.panelOpen) setDismissed(false);
  }, [structureAnalysis.panelOpen]);

  useEffect(() => {
    setDismissed(false);
    setExpanded(false);
    setActiveResidue(null);
  }, [proteinKey]);

  const layoutFromAnchor = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const anchor = anchorOrFallback(viewportPickAnchor, rect);
    setPosition(
      clampPanelPosition(anchor.x + 14, anchor.y - 18, panelSize.width, panelSize.height),
    );
  }, [clampPanelPosition, panelSize.height, panelSize.width, setPosition, viewportPickAnchor]);

  const reclampLockedPosition = useCallback(() => {
    reclampPosition();
  }, [reclampPosition]);

  useLayoutEffect(() => {
    if (!visible) return;
    if (positionLocked) {
      reclampLockedPosition();
      return;
    }
    if (mode === "residue") {
      layoutFromAnchor();
    }
  }, [
    visible,
    positionLocked,
    mode,
    layoutFromAnchor,
    reclampLockedPosition,
    viewportPickAnchor,
    expanded,
  ]);

  useEffect(() => {
    if (!visible) return;
    const onResize = () => {
      if (positionLocked) reclampLockedPosition();
      else if (mode === "residue") layoutFromAnchor();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [visible, layoutFromAnchor, mode, positionLocked, reclampLockedPosition]);

  /** Dock split resize does not fire window resize — follow pick anchor when unpinned. */
  useEffect(() => {
    if (!visible) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (positionLocked) return;
      if (mode === "residue") layoutFromAnchor();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible, mode, positionLocked, layoutFromAnchor]);

  useEffect(() => {
    if (!proteinKey) {
      setResidueHistory([]);
      setStructureHistory([]);
      return;
    }
    setResidueHistory(loadResidueAnalysisHistory(proteinKey));
    setStructureHistory(loadStructureAnalysisHistory(proteinKey));
  }, [proteinKey]);

  useEffect(() => {
    if (!proteinKey) return;
    if (activeStructure?.phase === "ready" || activeStructure?.phase === "error") {
      setStructureHistory(loadStructureAnalysisHistory(proteinKey));
    }
  }, [activeStructure?.entryId, activeStructure?.phase, proteinKey]);

  useEffect(() => {
    if (mode !== "residue") return;
    setExpanded(false);
    setActiveResidue(null);
  }, [residueKey, mode]);

  useEffect(() => {
    if (activeStructure?.phase === "loading") setExpanded(true);
  }, [activeStructure?.phase]);

  useEffect(() => {
    if (!expanded) return;
    const node = mode === "structure" ? structureActiveRef.current : activeRef.current;
    if (!node) return;
    node.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [
    expanded,
    mode,
    activeResidue?.phase,
    activeResidue?.content,
    activeResidue?.entryId,
    activeStructure?.phase,
    activeStructure?.content,
    activeStructure?.entryId,
  ]);

  const persistResidueEntry = useCallback(
    (entry: ResidueAnalysisEntry) => {
      if (!proteinKey) return;
      setResidueHistory(appendResidueAnalysisHistory(proteinKey, entry));
    },
    [proteinKey],
  );

  const runResidueAnalysis = async () => {
    if (!proteinKey) return;
    const entryId = `ra-${Date.now()}`;
    setExpanded(true);
    setActiveResidue({
      entryId,
      residueKey,
      chain,
      resno,
      resname,
      prompt: analysisLabel,
      phase: "loading",
      content: null,
    });

    const answer = await explain({
      intent: "residue",
      prompt: residuePrompt,
      popoverOnly: true,
      globalPopover: false,
    });

    if (!answer) {
      const notice = formatAiUserNotice("AI_UNKNOWN", t("couldNotAnalyze"));
      setActiveResidue((prev) => (prev ? { ...prev, phase: "error", content: notice } : prev));
      persistResidueEntry({
        id: entryId,
        proteinKey,
        residueKey,
        chain,
        resno,
        resname,
        prompt: analysisLabel,
        answer: notice,
        error: true,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    const isError = answer.includes("(AI_");
    setActiveResidue((prev) =>
      prev ? { ...prev, phase: isError ? "error" : "ready", content: answer } : prev,
    );
    persistResidueEntry({
      id: entryId,
      proteinKey,
      residueKey,
      chain,
      resno,
      resname,
      prompt: analysisLabel,
      answer,
      error: isError,
      createdAt: new Date().toISOString(),
    });
  };

  const dismissPanel = () => {
    closeStructureAnalysis();
    setDismissed(true);
  };

  if (!visible) return null;

  const hasStructureHistory = structureHistory.length > 0;
  const footerLabel =
    mode === "structure"
      ? hasStructureHistory || activeStructure
        ? t("structureAnalysis.rerun")
        : t("structureAnalysis.run")
      : analysisLabel;

  const onFooterClick = () => {
    if (mode === "structure") void analyzeStructure();
    else void runResidueAnalysis();
  };

  const collapsedMeta = mode === "structure" ? collapsedStructureMeta : collapsedResidueMeta;

  const panelNode = (
    <div
      className={cn(
        "pointer-events-auto absolute flex flex-col overflow-hidden border border-border bg-card/95 shadow-lg backdrop-blur-sm",
        (dragging || resizing) && "select-none",
      )}
      style={{
        left: position.left,
        top: position.top,
        width: panelSize.width,
        height: expanded ? panelSize.height : COLLAPSED_H,
      }}
    >
        <div className="flex shrink-0 items-start gap-1 border-b border-border">
          <div
            title={t("dragPanel")}
            {...dragHandleProps}
            onPointerDown={(e) => {
              dragHandleProps.onPointerDown(e);
              setPositionPinned(true);
            }}
            className={cn(
              "min-w-0 flex-1 touch-none px-2 py-1.5",
              dragging ? "cursor-grabbing" : "cursor-grab",
            )}
          >
            <div
              className={cn(
                "font-mono text-[11px] font-medium uppercase leading-none tracking-wider",
                mode === "structure" ? "text-accent" : "text-foreground",
              )}
            >
              {roleLabel}
            </div>
            <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
              {subjectLabel}
            </div>
            {expanded &&
            mode === "structure" &&
            activeStructure?.phase === "loading" ? (
              <div className="mt-1 flex items-center gap-1 font-mono text-[8px] text-muted-foreground">
                <Loader2 className="size-2.5 animate-spin" />
                {t("structureAnalysis.analyzing")}
              </div>
            ) : null}
            {!expanded && collapsedMeta ? (
              <div
                className={cn(
                  "mt-1 font-mono text-[8px]",
                  collapsedMeta.tone === "active" && "text-accent",
                  collapsedMeta.tone !== "active" && "text-muted-foreground",
                )}
              >
                {collapsedMeta.label}
              </div>
            ) : null}
            {!expanded && !collapsedMeta ? (
              <div className="mt-1 font-mono text-[8px] text-muted-foreground/70">
                {mode === "structure" ? t("structureAnalysis.empty") : t("noAnalysisYet")}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            title={expanded ? t("collapsePanel") : t("expandPanel")}
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </button>
          <button
            type="button"
            title={tc("actions.close")}
            onClick={dismissPanel}
            className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {expanded ? (
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {mode === "structure" ? (
              <>
                {priorStructureHistory.length > 0 ? (
                  <div className="mb-2 space-y-2 border-b border-border pb-2">
                    <div className="font-mono text-[8px] uppercase tracking-wide text-muted-foreground">
                      {t("history", { count: priorStructureHistory.length })}
                    </div>
                    {priorStructureHistory.map((entry) => (
                      <StructureHistoryBlock
                        key={entry.id}
                        entry={entry}
                        muted
                        defaultOpen={false}
                        locale={resolvedLocale}
                      />
                    ))}
                  </div>
                ) : !activeStructure ? (
                  <p className="mb-2 font-mono text-[8px] leading-snug text-muted-foreground">
                    {t("structureAnalysis.historyHint")}
                  </p>
                ) : null}

                {activeStructure ? (
                  <div
                    ref={structureActiveRef}
                    className={cn(
                      "space-y-1",
                      priorStructureHistory.length > 0 && "border-t border-border pt-2",
                    )}
                  >
                    <div className="font-mono text-[10px] font-medium uppercase tracking-wide text-foreground">
                      {t("structureAnalysis.current")}
                    </div>
                    {activeStructure.phase !== "loading" && lastStructureAnalysis ? (
                      <div className="font-mono text-[8px] text-muted-foreground">
                        {formatBeforeTime(lastStructureAnalysis.createdAt, resolvedLocale)}
                      </div>
                    ) : null}
                    <AnalysisBody
                      phase={activeStructure.phase}
                      content={activeStructure.content}
                      label={t("structureAnalysis.runLabel")}
                    />
                  </div>
                ) : lastStructureAnalysis ? (
                  <StructureHistoryBlock
                    entry={lastStructureAnalysis}
                    defaultOpen
                    locale={resolvedLocale}
                  />
                ) : null}
              </>
            ) : (
              <>
                {priorResidueHistory.length > 0 ? (
                  <div className="mb-2 space-y-2 border-b border-border pb-2">
                    <div className="font-mono text-[8px] uppercase tracking-wide text-muted-foreground">
                      {t("history", { count: priorResidueHistory.length })}
                    </div>
                    {priorResidueHistory.map((entry) => (
                      <ResidueHistoryBlock
                        key={entry.id}
                        entry={entry}
                        muted
                        defaultOpen={false}
                        locale={resolvedLocale}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mb-2 font-mono text-[8px] leading-snug text-muted-foreground">
                    {t("historyHint")}
                  </p>
                )}

                {activeResidue ? (
                  <div ref={activeRef} className="space-y-1 border-t border-border pt-2">
                    <div className="font-mono text-[10px] font-medium uppercase tracking-wide text-foreground">
                      {t("current", {
                        resname: activeResidue.resname,
                        chain: activeResidue.chain,
                        resno: activeResidue.resno,
                      })}
                    </div>
                    {activeResidue.phase !== "loading" && lastAnalysisForResidue ? (
                      <div className="font-mono text-[8px] text-muted-foreground">
                        {formatBeforeTime(lastAnalysisForResidue.createdAt, resolvedLocale)}
                      </div>
                    ) : null}
                    <AnalysisBody
                      phase={activeResidue.phase}
                      content={activeResidue.content}
                      label={activeResidue.prompt}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        <div className={cn("shrink-0 px-2 py-1.5", expanded && "border-t border-border")}>
          <button
            type="button"
            disabled={
              isSending ||
              !status?.configured ||
              (mode === "structure" && !proteinSelection)
            }
            onClick={onFooterClick}
            className="inline-flex w-full items-center justify-center gap-1 border border-border bg-background px-2 py-1 font-mono text-[8px] uppercase tracking-wide text-muted-foreground hover:border-accent hover:text-foreground disabled:opacity-40"
          >
            <Sparkles className="size-2.5" />
            {footerLabel}
          </button>
        </div>

        <FloatingPanelResizeHandles
          title={t("resizePanel")}
          resizing={resizing}
          axis={expanded ? "both" : "x"}
          getHandleProps={getResizeHandleProps}
        />
      </div>
  );

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[35] overflow-hidden">
      {panelNode}
    </div>
  );
}

function ResidueHistoryBlock({
  entry,
  muted,
  defaultOpen = false,
  locale,
}: {
  entry: ResidueAnalysisEntry;
  muted?: boolean;
  defaultOpen?: boolean;
  locale: SupportedUiLocale;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("border border-border bg-background/80", muted && "opacity-90")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-1 px-2 py-1.5 text-left hover:bg-background"
      >
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[8px] uppercase tracking-wide text-foreground">
            {entry.resname} · {entry.chain}:{entry.resno}
          </div>
          <div className="mt-0.5 font-mono text-[8px] text-muted-foreground">
            {formatBeforeTime(entry.createdAt, locale)}
            <span className="text-muted-foreground/70"> · {entry.prompt}</span>
          </div>
        </div>
        {open ? (
          <ChevronUp className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <div className="border-t border-border px-2 pb-2 pt-1 text-[10px] leading-relaxed text-card-foreground">
          {entry.error ? (
            <span className="text-muted-foreground">{entry.answer}</span>
          ) : (
            <Streamdown>{entry.answer}</Streamdown>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StructureHistoryBlock({
  entry,
  muted,
  defaultOpen = false,
  locale,
}: {
  entry: StructureAnalysisEntry;
  muted?: boolean;
  defaultOpen?: boolean;
  locale: SupportedUiLocale;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("border border-border bg-background/80", muted && "opacity-90")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-1 px-2 py-1.5 text-left hover:bg-background"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[8px] uppercase tracking-wide text-foreground">
            {entry.proteinLabel}
          </div>
          <div className="mt-0.5 font-mono text-[8px] text-muted-foreground">
            {formatBeforeTime(entry.createdAt, locale)}
            <span className="text-muted-foreground/70"> · {entry.prompt}</span>
          </div>
        </div>
        {open ? (
          <ChevronUp className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <div className="border-t border-border px-2 pb-2 pt-1 text-[10px] leading-relaxed text-card-foreground">
          {entry.error ? (
            <span className="text-muted-foreground">{entry.answer}</span>
          ) : (
            <Streamdown>{entry.answer}</Streamdown>
          )}
        </div>
      ) : null}
    </div>
  );
}

function AnalysisBody({
  phase,
  content,
  label,
}: {
  phase: "loading" | "ready" | "error";
  content: string | null;
  label: string;
}) {
  const { t } = useTranslation("assistant");

  if (phase === "loading") {
    return (
      <div className="flex items-center gap-2 py-2 text-[10px] text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        {t("running", { label: label.toLowerCase() })}
      </div>
    );
  }
  if (!content) return null;
  return (
    <div className={cn("text-[10px] leading-relaxed", phase === "error" && "text-muted-foreground")}>
      <Streamdown>{content}</Streamdown>
    </div>
  );
}
