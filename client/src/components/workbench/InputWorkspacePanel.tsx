import { FileStack, Layers } from "lucide-react";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useViewer } from "@/contexts/ViewerContext";
import type { ProteinSelection } from "@/lib/proteinApis";
import { proteinSelectionKey } from "@/lib/proteinApis";
import { cn } from "@/lib/utils";

/**
 * Structure load rail: current document summary and file import.
 */
export default function InputWorkspacePanel() {
  const { t } = useTranslation("workbench");
  const { proteinSelection, setProteinSelection, structureModel } = useViewer();
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".cif") && !lower.endsWith(".mmcif") && !lower.endsWith(".pdb") && !lower.endsWith(".ent")) {
        return;
      }
      const structureObjectUrl = URL.createObjectURL(file);
      const sel: ProteinSelection = {
        source: "file",
        id: file.name.replace(/\.[^.]+$/, ""),
        label: file.name,
        fileName: file.name,
        structureObjectUrl,
      };
      setProteinSelection(sel);
    },
    [setProteinSelection],
  );

  return (
    <div className="workstation-scroll-region flex min-h-0 flex-1 flex-col gap-2 p-2 font-mono text-[10px] text-muted-foreground">
      <div className="workbench-panel-inset p-2">
        <div className="workbench-kicker mb-1 flex items-center gap-1">
          <Layers className="size-3" />
          {t("input.entityStack")}
        </div>
        {proteinSelection ? (
          <div className="space-y-1 text-foreground">
            <div className="break-all">{proteinSelection.label}</div>
            <div className="text-muted-foreground">
              {proteinSelection.source} · {proteinSelectionKey(proteinSelection)}
            </div>
            {structureModel ? (
              <div className="text-muted-foreground">
                {t("input.atomsChains", {
                  atoms: structureModel.atomCount.toLocaleString(),
                  chains: structureModel.chains.length,
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-muted-foreground">{t("input.noDocument")}</div>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "border border-dashed p-4 text-center transition-colors",
          dragOver ? "border-accent bg-secondary" : "border-border bg-card",
        )}
      >
        <FileStack className="mx-auto mb-2 size-6 text-muted-foreground" />
        <div className="workbench-kicker text-foreground">{t("input.structureImport")}</div>
        <div className="mt-1 text-muted-foreground">{t("input.dropHint")}</div>
      </div>
    </div>
  );
}
