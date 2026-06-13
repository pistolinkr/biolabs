import React from "react";
import { useTranslation } from "react-i18next";
import { useViewer } from "@/contexts/ViewerContext";
import PolymerSequencePort from "@/components/workbench/PolymerSequencePort";

/**
 * Unified sequence dock under the viewport: protein + nucleic rows in one container,
 * equal row heights, shared footer hint.
 */
export default function ViewportSequenceDock() {
  const { t } = useTranslation("workbench");
  const { structureModel } = useViewer();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-border bg-card">
      <div
        className="grid min-h-0 flex-1 grid-rows-2 divide-y divide-border overflow-hidden"
        aria-label={t("sequence.dockLabel")}
      >
        <PolymerSequencePort embedded variant="protein" structureModel={structureModel} />
        <PolymerSequencePort embedded variant="nucleic" structureModel={structureModel} />
      </div>
      <p className="shrink-0 border-t border-border px-3 py-1 font-mono text-[8px] text-muted-foreground">
        {t("sequence.hint")}
      </p>
    </div>
  );
}
