import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
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
import { cn } from "@/lib/utils";
import type { SupportedUiLocale } from "@shared/i18n/locales";

const PANEL_W_COLLAPSED = 248;
const PANEL_W_EXPANDED = 336;
const PANEL_MAX_H = 380;
const PANEL_H_COLLAPSED = 88;

interface ActiveAnalysis {
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

export default function ResidueAnalysisPanel() {
  const { t } = useTranslation("assistant");
  const { resolvedLocale } = useLocale();
  const { explain, isSending, status, aiSettings } = useAssistant();
  const {
    proteinSelection,
    viewportPickDetail,
    selectedResidueKey,
    viewportPickAnchor,
  } = useViewer();

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<ResidueAnalysisEntry[]>([]);
  const [active, setActive] = useState<ActiveAnalysis | null>(null);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const [positionPinned, setPositionPinned] = useState(false);
  const [dragging, setDragging] = useState(false);

  const proteinKey = proteinKeyFromSelection(proteinSelection);
  const analysisLabel = t("analysisLabel");

  const chain = viewportPickDetail?.chain ?? selectedResidueKey?.split(":")[0] ?? "?";
  const resno = String(viewportPickDetail?.resno ?? selectedResidueKey?.split(":")[1] ?? "?");
  const resname = viewportPickDetail?.resname ?? "residue";
  const residueKey = residueKeyFromParts(chain, resno);

  const prompt = `Explain residue ${resname} ${chain}:${resno} in the currently loaded structure. Cover side-chain chemistry, typical roles, and local structural context using platform analysis data.`;

  const priorHistory = useMemo(() => {
    if (!active) return history;
    return history.filter((e) => e.id !== active.entryId);
  }, [history, active]);

  const lastAnalysisForResidue = useMemo(
    () => findLatestEntryForResidue(history, residueKey),
    [history, residueKey],
  );

  const collapsedMeta = useMemo(() => {
    if (active?.phase === "loading") {
      return { label: t("analyzing"), tone: "active" as const };
    }
    if (lastAnalysisForResidue) {
      return {
        label: formatBeforeTime(lastAnalysisForResidue.createdAt, resolvedLocale),
        tone: lastAnalysisForResidue.error ? ("error" as const) : ("done" as const),
      };
    }
    return null;
  }, [active?.phase, lastAnalysisForResidue, resolvedLocale, t]);

  const panelSize = useMemo(
    () => ({
      width: expanded ? PANEL_W_EXPANDED : PANEL_W_COLLAPSED,
      height: expanded ? PANEL_MAX_H : PANEL_H_COLLAPSED,
    }),
    [expanded],
  );

  const clampPanelPosition = useCallback(
    (left: number, top: number, width = panelSize.width, height = panelSize.height) => {
      const container = containerRef.current;
      const rect = container?.getBoundingClientRect();
      const maxW = rect?.width ?? 640;
      const maxH = rect?.height ?? 480;
      return {
        left: clamp(left, 8, Math.max(8, maxW - width - 8)),
        top: clamp(top, 8, Math.max(8, maxH - height - 8)),
      };
    },
    [panelSize.height, panelSize.width],
  );

  const layoutFromAnchor = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const anchor = anchorOrFallback(viewportPickAnchor, rect);
    setPosition(
      clampPanelPosition(anchor.x + 14, anchor.y - 18, panelSize.width, panelSize.height),
    );
  }, [clampPanelPosition, panelSize.height, panelSize.width, viewportPickAnchor]);

  const reclampPinnedPosition = useCallback(() => {
    setPosition((prev) => clampPanelPosition(prev.left, prev.top));
  }, [clampPanelPosition]);

  useLayoutEffect(() => {
    if (positionPinned) {
      reclampPinnedPosition();
      return;
    }
    layoutFromAnchor();
  }, [
    layoutFromAnchor,
    reclampPinnedPosition,
    positionPinned,
    chain,
    resno,
    expanded,
    viewportPickAnchor,
  ]);

  useEffect(() => {
    const onResize = () => {
      if (positionPinned) reclampPinnedPosition();
      else layoutFromAnchor();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [layoutFromAnchor, positionPinned, reclampPinnedPosition]);

  useEffect(() => {
    if (!proteinKey) {
      setHistory([]);
      return;
    }
    setHistory(loadResidueAnalysisHistory(proteinKey));
  }, [proteinKey]);

  useEffect(() => {
    setExpanded(false);
    setActive(null);
    setPositionPinned(false);
  }, [residueKey]);

  const onDragHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: position.left,
      originTop: position.top,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setPositionPinned(true);
    setPosition(clampPanelPosition(drag.originLeft + dx, drag.originTop + dy));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
  };

  useEffect(() => {
    if (!expanded || !activeRef.current) return;
    activeRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [expanded, active?.phase, active?.content, active?.entryId]);

  const persistEntry = useCallback(
    (entry: ResidueAnalysisEntry) => {
      if (!proteinKey) return;
      setHistory(appendResidueAnalysisHistory(proteinKey, entry));
    },
    [proteinKey],
  );

  const runAnalysis = async () => {
    if (!proteinKey) return;
    const entryId = `ra-${Date.now()}`;
    setExpanded(true);
    setActive({
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
      prompt,
      popoverOnly: true,
      globalPopover: false,
    });

    if (!answer) {
      const notice = formatAiUserNotice("AI_UNKNOWN", t("couldNotAnalyze"));
      setActive((prev) =>
        prev
          ? { ...prev, phase: "error", content: notice }
          : prev,
      );
      persistEntry({
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
    setActive((prev) =>
      prev
        ? { ...prev, phase: isError ? "error" : "ready", content: answer }
        : prev,
    );
    persistEntry({
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

  if (!aiSettings.showResidueExplainPopup) return null;
  if (!proteinSelection) return null;
  if (!viewportPickDetail && !selectedResidueKey) return null;

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div
        className={cn(
          "pointer-events-auto absolute flex flex-col overflow-hidden border border-border bg-card/95 shadow-lg backdrop-blur-sm",
          dragging && "select-none",
        )}
        style={{
          left: position.left,
          top: position.top,
          width: panelSize.width,
          maxHeight: expanded ? PANEL_MAX_H : undefined,
        }}
      >
        <div className="flex shrink-0 items-start gap-1 border-b border-border">
          <div
            title={t("dragPanel")}
            onPointerDown={onDragHandlePointerDown}
            onPointerMove={onDragHandlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={cn(
              "min-w-0 flex-1 touch-none px-2 py-1.5",
              dragging ? "cursor-grabbing" : "cursor-grab",
            )}
          >
            <div className="truncate font-mono text-[9px] uppercase tracking-wide text-foreground">
              {resname} · {chain}:{resno}
            </div>
            {expanded ? (
              <div className="font-mono text-[8px] text-muted-foreground">{analysisLabel}</div>
            ) : collapsedMeta ? (
              <div
                className={cn(
                  "mt-0.5 font-mono text-[8px]",
                  collapsedMeta.tone === "active" && "text-accent",
                  collapsedMeta.tone === "done" && "text-muted-foreground",
                  collapsedMeta.tone === "error" && "text-muted-foreground",
                )}
              >
                {collapsedMeta.label}
                {collapsedMeta.tone !== "active" ? (
                  <span className="text-muted-foreground/70"> · {analysisLabel}</span>
                ) : null}
              </div>
            ) : (
              <div className="mt-0.5 font-mono text-[8px] text-muted-foreground/70">
                {t("noAnalysisYet")}
              </div>
            )}
          </div>
          <button
            type="button"
            title={expanded ? t("collapsePanel") : t("expandPanel")}
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </button>
        </div>

        {expanded ? (
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {priorHistory.length > 0 ? (
              <div className="mb-2 space-y-2 border-b border-border pb-2">
                <div className="font-mono text-[8px] uppercase tracking-wide text-muted-foreground">
                  {t("history", { count: priorHistory.length })}
                </div>
                {priorHistory.map((entry) => (
                  <HistoryBlock key={entry.id} entry={entry} muted defaultOpen={false} locale={resolvedLocale} />
                ))}
              </div>
            ) : (
              <p className="mb-2 font-mono text-[8px] leading-snug text-muted-foreground">
                {t("historyHint")}
              </p>
            )}

            {active ? (
              <div ref={activeRef} className="space-y-1 border-t border-border pt-2">
                <div className="font-mono text-[8px] uppercase tracking-wide text-accent">
                  {t("current", { resname: active.resname, chain: active.chain, resno: active.resno })}
                </div>
                {active.phase !== "loading" && lastAnalysisForResidue ? (
                  <div className="font-mono text-[8px] text-muted-foreground">
                    {formatBeforeTime(lastAnalysisForResidue.createdAt, resolvedLocale)}
                  </div>
                ) : null}
                <AnalysisBody
                  phase={active.phase}
                  content={active.content}
                  label={active.prompt}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={cn("shrink-0 px-2 py-1.5", expanded && "border-t border-border")}>
          <button
            type="button"
            disabled={isSending || !status?.configured}
            onClick={() => void runAnalysis()}
            className="inline-flex w-full items-center justify-center gap-1 border border-border bg-background px-2 py-1 font-mono text-[8px] uppercase tracking-wide text-muted-foreground hover:border-accent hover:text-foreground disabled:opacity-40"
          >
            <Sparkles className="size-2.5" />
            {analysisLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryBlock({
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
    <div
      className={cn(
        "border border-border bg-background/80",
        muted && "opacity-90",
      )}
    >
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
