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
    <div className="flex min-h-8 shrink-0 items-center gap-3 bg-background px-2 py-1 font-mono text-[10px] text-muted-foreground">
      <span className="min-w-0 shrink" title={structLine}>
        <span className="mr-1 text-[9px] uppercase tracking-wider text-muted-foreground">{t("bottomStrip.struct")}</span>
        <span className="truncate text-foreground">{structLine}</span>
      </span>
      <span className="min-w-0 shrink-0 text-foreground" title={pickLine}>
        <span className="mr-1 text-[9px] uppercase tracking-wider text-muted-foreground">{t("bottomStrip.pick")}</span>
        {pickLine}
      </span>
      {measurementMode !== "none" ? (
        <span
          className="text-[9px] uppercase text-muted-foreground"
          title={t(`bottomStrip.measureHints.${measurementMode}`)}
        >
            {t("bottomStrip.measureHint", {
              mode: t(`toolbar.measureModes.${measurementMode}`),
              hint: t(`bottomStrip.measureHints.${measurementMode}`),
            })}
          </span>
      ) : null}
      {overlayLine ? (
        <span className="min-w-0 shrink text-[9px] uppercase text-muted-foreground" title={overlayLine}>
          {overlayLine}
        </span>
      ) : null}
    </div>
  );
}
