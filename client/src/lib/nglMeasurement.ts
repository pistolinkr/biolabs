import { MouseActions, type PickingProxy, type Stage, type StructureComponent } from "ngl";
import type { MeasurementMode } from "@/contexts/ViewerContext";

export function handleViewportMeasurementPick(
  stage: Stage,
  pickingProxy: PickingProxy | null | undefined,
  mode: MeasurementMode,
): boolean {
  if (mode === "none") return false;
  MouseActions.measurePick(stage, (pickingProxy ?? null) as PickingProxy);
  return true;
}

export function clearViewportMeasurements(sc: StructureComponent | null): void {
  if (!sc) return;
  try {
    sc.measureClear();
  } catch {
    /* NGL not ready */
  }
}
