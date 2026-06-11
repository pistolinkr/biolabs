import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { StructureHierarchyModel } from "@/contexts/ViewerContext";
import type { BiomolecularEntityKind } from "@/lib/biomolecularEntities";
import { useViewer, type SequencePolymerKind } from "@/contexts/ViewerContext";
import { parseChainResidueKey } from "@/lib/nglSequenceNeighborhood";
import { cn } from "@/lib/utils";

const WINDOW_RESIDUES = 420;
const APPROX_CHAR_PX = 9;

function scrollSequenceStripToOrdinal(
  scroller: HTMLDivElement | null,
  stripOrdinal: number,
  seqLength: number,
  useVirtual: boolean,
  setSliceStart: React.Dispatch<React.SetStateAction<number>>,
): void {
  if (!scroller || stripOrdinal < 1 || stripOrdinal > seqLength) return;
  const o = stripOrdinal - 1;
  const targetLeft = Math.max(0, o * APPROX_CHAR_PX - Math.floor(scroller.clientWidth / 2) + APPROX_CHAR_PX / 2);
  scroller.scrollLeft = Math.min(targetLeft, Math.max(0, scroller.scrollWidth - scroller.clientWidth));
  if (useVirtual) {
    const start = Math.min(
      Math.max(0, seqLength - WINDOW_RESIDUES),
      Math.max(0, Math.floor(scroller.scrollLeft / APPROX_CHAR_PX)),
    );
    setSliceStart(start);
  }
}

function selectionMatchesVariant(
  variant: "protein" | "nucleic",
  selectedSequencePolymerKind: SequencePolymerKind | null,
  viewportPickPolymerKind: SequencePolymerKind | null,
): boolean {
  if (selectedSequencePolymerKind) return selectedSequencePolymerKind === variant;
  return viewportPickPolymerKind === variant;
}

function kindMatchesVariant(variant: "protein" | "nucleic", k: BiomolecularEntityKind): boolean {
  if (variant === "protein") return k === "protein";
  return k === "dna" || k === "rna";
}

export interface PolymerSequencePortProps {
  variant: "protein" | "nucleic";
  structureModel: StructureHierarchyModel | null;
}

/**
 * RCSB-style horizontal sequence port — protein or nucleic — with virtualized window for long polymers.
 */
export default function PolymerSequencePort({ variant, structureModel }: PolymerSequencePortProps) {
  const { t } = useTranslation("workbench");
  const {
    selectedResidueKey,
    selectedSequencePolymerKind,
    viewportPickPolymerKind,
    setSelectedResidueFromSequence,
    setViewportPickDetail,
    hoverChainId,
    polymerContextSnapshot,
  } = useViewer();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [chainOverride, setChainOverride] = useState<string | null>(null);
  const [focusResidueQuery, setFocusResidueQuery] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const panelTitle =
    variant === "protein" ? t("sequence.proteinTitle") : t("sequence.nucleicTitle");

  const eligibleChains = useMemo(() => {
    if (!structureModel?.chains.length) return [];
    return structureModel.chains.filter((c) => kindMatchesVariant(variant, c.entityKind));
  }, [structureModel?.chains, variant]);

  const defaultChainId = useMemo(() => {
    if (!structureModel || !eligibleChains.length) return undefined;
    const withSeq = sequencesForVariant(structureModel, variant);
    const withLetters = eligibleChains.find((c) => (withSeq[c.id] ?? "").length > 0);
    return withLetters?.id ?? eligibleChains[0].id;
  }, [structureModel, eligibleChains, variant]);

  useEffect(() => {
    setChainOverride(null);
    setFocusResidueQuery("");
  }, [structureModel?.title, structureModel?.atomCount, variant]);

  const chainIds = eligibleChains.map((c) => c.id);
  const effectiveChainId =
    chainOverride && chainIds.includes(chainOverride) ? chainOverride : defaultChainId;

  const activeChainMeta = useMemo(
    () => eligibleChains.find((c) => c.id === effectiveChainId),
    [eligibleChains, effectiveChainId],
  );

  const seq = useMemo(() => {
    if (!structureModel || !effectiveChainId) return "";
    const map = sequencesForVariant(structureModel, variant);
    return map[effectiveChainId] ?? "";
  }, [structureModel, effectiveChainId, variant]);

  const sequencesSkipped =
    !!structureModel &&
    !!effectiveChainId &&
    seq.length === 0 &&
    (activeChainMeta?.residueCount ?? 0) > 0;

  const totalLen = sequencesSkipped && activeChainMeta ? activeChainMeta.residueCount : seq.length;

  const useVirtual = seq.length > WINDOW_RESIDUES;
  const [sliceStart, setSliceStart] = useState(0);

  useEffect(() => {
    setSliceStart(0);
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [seq, effectiveChainId]);

  /** Viewport pick → switch chain tab for the matching polymer strip. */
  useEffect(() => {
    if (!viewportPickPolymerKind || viewportPickPolymerKind !== variant) return;
    if (!selectedResidueKey) return;
    const parsed = parseChainResidueKey(selectedResidueKey);
    if (!parsed || !eligibleChains.some((c) => c.id === parsed.chain)) return;
    setChainOverride(parsed.chain);
  }, [viewportPickPolymerKind, variant, selectedResidueKey, eligibleChains]);

  /** Scroll strip to selection (viewport pick or sequence click). */
  useEffect(() => {
    if (!seq.length || !selectedResidueKey) return;
    if (!selectionMatchesVariant(variant, selectedSequencePolymerKind, viewportPickPolymerKind)) return;
    const parsed = parseChainResidueKey(selectedResidueKey);
    if (!parsed || parsed.chain !== effectiveChainId) return;
    scrollSequenceStripToOrdinal(scrollerRef.current, parsed.index, seq.length, useVirtual, setSliceStart);
  }, [
    selectedResidueKey,
    selectedSequencePolymerKind,
    viewportPickPolymerKind,
    variant,
    effectiveChainId,
    seq.length,
    useVirtual,
  ]);

  /** Context radius sync — nucleic strip follows nearest nucleic in neighborhood. */
  useEffect(() => {
    if (variant !== "nucleic") return;
    const nn = polymerContextSnapshot?.nearestNucleic;
    if (!nn || !eligibleChains.some((c) => c.id === nn.chainId)) return;
    setChainOverride(nn.chainId);
  }, [variant, polymerContextSnapshot, eligibleChains]);

  useEffect(() => {
    if (variant !== "nucleic" || !polymerContextSnapshot?.nearestNucleic || !seq.length) return;
    const { chainId, stripOrdinal } = polymerContextSnapshot.nearestNucleic;
    if (effectiveChainId !== chainId) return;
    scrollSequenceStripToOrdinal(scrollerRef.current, stripOrdinal, seq.length, useVirtual, setSliceStart);
  }, [variant, polymerContextSnapshot, effectiveChainId, seq.length, useVirtual]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !useVirtual) return;
    const start = Math.min(
      Math.max(0, seq.length - WINDOW_RESIDUES),
      Math.max(0, Math.floor(el.scrollLeft / APPROX_CHAR_PX)),
    );
    setSliceStart(start);
  }, [seq.length, useVirtual]);

  const { slice, start } = useMemo(() => {
    if (!useVirtual) return { slice: seq, start: 0 };
    const s = Math.min(sliceStart, Math.max(0, seq.length - WINDOW_RESIDUES));
    return { slice: seq.slice(s, s + WINDOW_RESIDUES), start: s };
  }, [seq, useVirtual, sliceStart]);

  const filteredIdx = useMemo(() => {
    if (!focusResidueQuery.trim() || !seq.length) return null;
    const n = parseInt(focusResidueQuery, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= seq.length) return n - 1;
    return null;
  }, [focusResidueQuery, seq]);

  const isStripResidueHighlighted = useCallback(
    (globalIdx: number) => {
      if (hoverIdx === globalIdx || filteredIdx === globalIdx) return true;
      if (!selectedResidueKey || `${effectiveChainId}:${globalIdx + 1}` !== selectedResidueKey) return false;
      return selectionMatchesVariant(variant, selectedSequencePolymerKind, viewportPickPolymerKind);
    },
    [
      hoverIdx,
      filteredIdx,
      selectedResidueKey,
      effectiveChainId,
      variant,
      selectedSequencePolymerKind,
      viewportPickPolymerKind,
    ],
  );

  if (!structureModel) {
    return (
      <div className="shrink-0 border-t border-border bg-background px-3 py-2">
        <div className="font-mono text-[11px] font-medium text-foreground">{panelTitle}</div>
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          Load a structure to show the 1-letter sequence
        </div>
      </div>
    );
  }

  if (!eligibleChains.length) {
    return (
      <div className="shrink-0 border-t border-[#2A2A2A] bg-[#0C0C0C] px-3 py-2">
        <div className="font-mono text-[11px] font-medium text-[#D8D8D8]">{panelTitle}</div>
        <div className="mt-0.5 font-mono text-[9px] text-[#6A6A6A]">
          {variant === "protein"
            ? "No protein polymer chains in this structure."
            : "No displayable DNA/RNA polymer chains in this structure."}
        </div>
      </div>
    );
  }

  if (sequencesSkipped) {
    return (
      <div className="shrink-0 border-t border-[#2A2A2A] bg-[#111111] px-3 py-2 font-mono text-[10px] leading-snug text-[#B0B0B0]">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-[#2A2A2A] pb-1.5">
          <span className="text-[11px] font-medium text-[#E8E8E8]">{panelTitle}</span>
          <span className="text-[9px] text-[#6A6A6A]">chain {effectiveChainId}</span>
        </div>
        <div className="mt-1.5 text-[#9A9A9A]">
          Sequence omitted for large structure ({totalLen.toLocaleString()} residues). Jump via{" "}
          <span className="text-[#D8D8D8]">RES #</span>.
        </div>
      </div>
    );
  }

  if (!seq.length) {
    return (
      <div className="shrink-0 border-t border-[#2A2A2A] bg-[#0C0C0C] px-3 py-2">
        <div className="font-mono text-[11px] font-medium text-[#D8D8D8]">{panelTitle}</div>
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-[#6A6A6A]">
          {variant === "protein"
            ? `No standard amino-acid sequence on chain ${effectiveChainId}`
            : `No nucleic 1-letter sequence on chain ${effectiveChainId}`}
        </div>
      </div>
    );
  }

  const unitLabel = variant === "protein" ? "aa" : "nt";
  const glyphClass =
    variant === "nucleic"
      ? "text-[#C8D8E8]"
      : "text-[#D4D4D4]";

  return (
    <div
      className={cn(
        "flex min-h-[88px] shrink-0 flex-col border-t border-border bg-card",
        hoverChainId && hoverChainId === effectiveChainId && "ring-1 ring-[#6A737C] ring-inset",
      )}
      aria-label={variant === "protein" ? "Amino acid sequence panel" : "Nucleic acid sequence panel"}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-1.5">
        <div className="flex min-w-0 flex-col gap-0 leading-tight">
          <span className="font-mono text-[11px] font-medium text-foreground">{panelTitle}</span>
        </div>
        {eligibleChains.length > 1 ? (
          <label className="flex items-center gap-1 font-mono text-[9px] text-[#8A8A8A]">
            <span className="uppercase tracking-wider">Chain</span>
            <select
              value={effectiveChainId}
              onChange={(e) => setChainOverride(e.target.value)}
              className="max-w-[10rem] border border-border bg-input px-1 py-0.5 font-mono text-[10px] text-foreground focus:outline-none"
            >
              {eligibleChains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.entityKind} · {c.residueCount} res
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            SEQ {effectiveChainId}
          </span>
        )}
        <input
          value={focusResidueQuery}
          onChange={(e) => setFocusResidueQuery(e.target.value)}
          placeholder="RES #"
          className="w-16 border border-border bg-input px-1 py-0.5 font-mono text-[10px] text-foreground focus:outline-none"
          title="Jump to residue number"
        />
        {useVirtual ? (
          <span className="ml-auto shrink-0 font-mono text-[8px] text-[#6A6A6A]">
            {start + 1}–{start + slice.length} / {seq.length.toLocaleString()}
          </span>
        ) : (
          <span className="ml-auto shrink-0 font-mono text-[8px] text-[#6A6A6A]">
            {seq.length} {unitLabel}
          </span>
        )}
      </div>
      <div
        ref={scrollerRef}
        onScroll={useVirtual ? onScroll : undefined}
        className="min-h-[48px] max-h-[min(22vh,152px)] overflow-x-auto overflow-y-hidden px-3 py-1.5"
      >
        {useVirtual ? (
          <div
            className={cn("relative font-mono text-[12px] leading-none tracking-tight", glyphClass)}
            style={{ width: seq.length * APPROX_CHAR_PX, minHeight: 26 }}
          >
            <div className="absolute top-0 flex gap-px" style={{ left: start * APPROX_CHAR_PX }}>
              {slice.split("").map((ch: string, i: number) => {
                const globalIdx = start + i;
                const hi = isStripResidueHighlighted(globalIdx);
                return (
                  <button
                    key={globalIdx}
                    type="button"
                    title={`${effectiveChainId} ${globalIdx + 1} ${ch}`}
                    className={`min-w-[11px] border px-[2px] py-0.5 ${
                      hi
                        ? "border-[#F2F2F2] bg-[#1C1C1C] text-[#F2F2F2]"
                        : "border-transparent text-[#B0B0B0] hover:border-[#3A3A3A]"
                    }`}
                    onMouseEnter={() => setHoverIdx(globalIdx)}
                    onMouseLeave={() => setHoverIdx(null)}
                    onClick={() => {
                      setViewportPickDetail(null);
                      setSelectedResidueFromSequence(
                        `${effectiveChainId}:${globalIdx + 1}`,
                        variant === "protein" ? "protein" : "nucleic",
                      );
                    }}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={cn("flex min-w-max gap-px font-mono text-[12px] leading-none tracking-tight", glyphClass)}>
            {slice.split("").map((ch: string, i: number) => {
              const globalIdx = i;
              const hi = isStripResidueHighlighted(globalIdx);
              return (
                <button
                  key={globalIdx}
                  type="button"
                  title={`${effectiveChainId} ${globalIdx + 1} ${ch}`}
                  className={`min-w-[11px] border px-[2px] py-0.5 ${
                    hi
                      ? "border-[#F2F2F2] bg-[#1C1C1C] text-[#F2F2F2]"
                      : "border-transparent text-[#B0B0B0] hover:border-[#3A3A3A]"
                  }`}
                  onMouseEnter={() => setHoverIdx(globalIdx)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onClick={() => {
                    setViewportPickDetail(null);
                    setSelectedResidueFromSequence(
                      `${effectiveChainId}:${globalIdx + 1}`,
                      variant === "protein" ? "protein" : "nucleic",
                    );
                  }}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="border-t border-border px-3 py-1 font-mono text-[8px] text-muted-foreground">
        Click a residue to focus the viewport · viewport picks scroll and highlight here
      </div>
    </div>
  );
}

function sequencesForVariant(
  m: StructureHierarchyModel,
  variant: "protein" | "nucleic",
): Record<string, string> {
  return variant === "protein" ? m.sequenceByChain : m.nucleicSequenceByChain;
}
