import React, { useMemo } from "react";
import { useViewer } from "@/contexts/ViewerContext";

/** Bottom status strip: structure metrics + picked residue (RCSB-style context rail). */
export default function ViewportBottomInfoStrip() {
  const {
    structureModel,
    proteinSelection,
    viewportPickDetail,
    selectedResidueKey,
    measurementMode,
  } = useViewer();

  const pickLine = useMemo(() => {
    if (viewportPickDetail) {
      const { chain, resno, resname } = viewportPickDetail;
      return `CHAIN ${chain} · RES ${resno} · ${resname}`;
    }
    if (selectedResidueKey) return `Selection · ${selectedResidueKey}`;
    return "Pick: click atom / residue in viewport";
  }, [viewportPickDetail, selectedResidueKey]);

  const structLine = structureModel
    ? `${structureModel.title} · ${structureModel.atomCount.toLocaleString()} atoms · ${structureModel.residueCount.toLocaleString()} res · ${structureModel.chains.length} chains`
    : proteinSelection
      ? `${proteinSelection.label} · loading…`
      : "No structure loaded";

  return (
    <div className="flex min-h-8 shrink-0 items-center gap-3 border-t border-[#2A2A2A] bg-[#111111] px-2 py-1 font-mono text-[10px] text-[#B0B0B0]">
      <span className="min-w-0 shrink text-[#8A8A8A]" title={structLine}>
        <span className="mr-1 text-[9px] uppercase tracking-wider text-[#6A6A6A]">Struct</span>
        <span className="truncate text-[#E8E8E8]">{structLine}</span>
      </span>
      <div className="h-4 w-px shrink-0 bg-[#2A2A2A]" />
      <span className="min-w-0 shrink-0 text-[#C8C8C8]" title={pickLine}>
        <span className="mr-1 text-[9px] uppercase tracking-wider text-[#6A6A6A]">Pick</span>
        {pickLine}
      </span>
      {measurementMode !== "none" ? (
        <>
          <div className="h-4 w-px shrink-0 bg-[#2A2A2A]" />
          <span className="text-[9px] uppercase text-[#9A9A7A]">Measure · {measurementMode}</span>
        </>
      ) : null}
    </div>
  );
}
