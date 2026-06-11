import type { PolymerContextSnapshot, StructureHierarchyModel } from "@/contexts/ViewerContext";

export function structureHasNucleicChains(model: StructureHierarchyModel | null): boolean {
  if (!model) return false;
  return Object.values(model.nucleicSequenceByChain).some((seq) => seq.length > 0);
}

export function hasActivePolymerPick(
  viewportPickDetail: unknown,
  selectedResidueKey: string | null,
): boolean {
  return Boolean(viewportPickDetail || selectedResidueKey);
}

export type PolymerOverlayToastKind = "ixn" | "nucleic";

export function resolvePolymerOverlayToastKey(
  kind: PolymerOverlayToastKind,
  enabling: boolean,
  model: StructureHierarchyModel | null,
  hasPick: boolean,
  snapshot: PolymerContextSnapshot | null,
): string {
  if (!hasPick) return "toasts.overlayNeedsPick";
  if (!structureHasNucleicChains(model)) return "toasts.overlayNoNucleic";

  if (kind === "ixn") {
    if (!enabling) return "toasts.overlayLinesOff";
    return (snapshot?.candidateHeavyContactCount ?? 0) > 0
      ? "toasts.overlayLinesOn"
      : "toasts.overlayNoPairsInContext";
  }

  if (!enabling) return "toasts.nucleicAccentOff";
  return (snapshot?.nucleicResidueCount ?? 0) > 0
    ? "toasts.nucleicAccentOnDetail"
    : "toasts.nucleicAccentNoContext";
}
