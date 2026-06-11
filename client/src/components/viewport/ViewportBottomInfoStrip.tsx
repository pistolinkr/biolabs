import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useViewer } from "@/contexts/ViewerContext";
import { hasActivePolymerPick, structureHasNucleicChains } from "@/lib/polymerOverlayFeedback";

/** Bottom status strip: structure metrics + picked residue (RCSB-style context rail). */
export default function ViewportBottomInfoStrip() {
  const { t } = useTranslation("viewport");
  const {
    structureModel,
    proteinSelection,
    viewportPickDetail,
    selectedResidueKey,
    measurementMode,
    polymerInteractionOverlayEnabled,
    nucleicBackboneAccentEnabled,
    polymerContextSnapshot,
  } = useViewer();

  const pickLine = useMemo(() => {
    if (viewportPickDetail) {
      const { chain, resno, resname } = viewportPickDetail;
      return t("bottomStrip.pickDetail", { chain, resno, resname });
    }
    if (selectedResidueKey) return t("bottomStrip.selection", { key: selectedResidueKey });
    return t("bottomStrip.pickHint");
  }, [viewportPickDetail, selectedResidueKey, t]);

  const structLine = structureModel
    ? t("bottomStrip.structDetail", {
        title: structureModel.title,
        atoms: structureModel.atomCount.toLocaleString(),
        residues: structureModel.residueCount.toLocaleString(),
        chains: structureModel.chains.length,
      })
    : proteinSelection
      ? t("bottomStrip.loading", { label: proteinSelection.label })
      : t("bottomStrip.noStructure");

  const overlayLine = useMemo(() => {
    if (!polymerInteractionOverlayEnabled && !nucleicBackboneAccentEnabled) return null;
    if (!hasActivePolymerPick(viewportPickDetail, selectedResidueKey)) {
      return t("bottomStrip.overlayNeedsPick");
    }
    if (!structureHasNucleicChains(structureModel)) {
      return t("bottomStrip.overlayNoNucleic");
    }
    const parts: string[] = [];
    if (polymerInteractionOverlayEnabled) {
      parts.push(
        t("bottomStrip.overlayIxn", {
          count: polymerContextSnapshot?.candidateHeavyContactCount ?? 0,
        }),
      );
    }
    if (nucleicBackboneAccentEnabled) {
      parts.push(
        t("bottomStrip.overlayNt", {
          count: polymerContextSnapshot?.nucleicResidueCount ?? 0,
        }),
      );
    }
    return parts.join(" · ");
  }, [
    nucleicBackboneAccentEnabled,
    polymerContextSnapshot,
    polymerInteractionOverlayEnabled,
    selectedResidueKey,
    structureModel,
    t,
    viewportPickDetail,
  ]);

  return (
    <div className="flex min-h-8 shrink-0 items-center gap-3 border-t border-[#2A2A2A] bg-[#111111] px-2 py-1 font-mono text-[10px] text-[#B0B0B0]">
      <span className="min-w-0 shrink text-[#8A8A8A]" title={structLine}>
        <span className="mr-1 text-[9px] uppercase tracking-wider text-[#6A6A6A]">{t("bottomStrip.struct")}</span>
        <span className="truncate text-[#E8E8E8]">{structLine}</span>
      </span>
      <div className="h-4 w-px shrink-0 bg-[#2A2A2A]" />
      <span className="min-w-0 shrink-0 text-[#C8C8C8]" title={pickLine}>
        <span className="mr-1 text-[9px] uppercase tracking-wider text-[#6A6A6A]">{t("bottomStrip.pick")}</span>
        {pickLine}
      </span>
      {measurementMode !== "none" ? (
        <>
          <div className="h-4 w-px shrink-0 bg-[#2A2A2A]" />
          <span
            className="text-[9px] uppercase text-[#9A9A7A]"
            title={t(`bottomStrip.measureHints.${measurementMode}`)}
          >
            {t("bottomStrip.measureHint", {
              mode: t(`toolbar.measureModes.${measurementMode}`),
              hint: t(`bottomStrip.measureHints.${measurementMode}`),
            })}
          </span>
        </>
      ) : null}
      {overlayLine ? (
        <>
          <div className="h-4 w-px shrink-0 bg-[#2A2A2A]" />
          <span className="min-w-0 shrink text-[9px] uppercase text-[#9A9A7A]" title={overlayLine}>
            {overlayLine}
          </span>
        </>
      ) : null}
    </div>
  );
}
