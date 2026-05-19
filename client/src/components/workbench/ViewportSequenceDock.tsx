import React from "react";
import { useViewer } from "@/contexts/ViewerContext";
import PolymerSequencePort from "@/components/workbench/PolymerSequencePort";

/**
 * RCSB-like dual stack under the viewport: protein sequence port + nucleic sequence port.
 */
export default function ViewportSequenceDock() {
  const { structureModel } = useViewer();

  return (
    <div className="flex min-h-0 shrink-0 flex-col">
      <PolymerSequencePort variant="protein" structureModel={structureModel} />
      <PolymerSequencePort variant="nucleic" structureModel={structureModel} />
    </div>
  );
}
