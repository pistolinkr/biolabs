import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import InputWorkspacePanel from "@/components/workbench/InputWorkspacePanel";
import StructureHierarchyPanel from "@/components/workbench/StructureHierarchyPanel";
import VisualizationControlPanel from "@/components/workbench/VisualizationControlPanel";
import ProteinSourcePanel from "@/components/workbench/ProteinSourcePanel";
import { useWorkflow } from "@/contexts/WorkflowContext";
import type { LeftWorkbenchTab } from "@/contexts/WorkflowContext";
import { cn } from "@/lib/utils";

type Tab = LeftWorkbenchTab;

export default function LeftWorkstationPanel() {
  const { t } = useTranslation("common");
  const { leftTabRequest, clearLeftTabRequest } = useWorkflow();
  const [tab, setTab] = useState<Tab>("input");

  const TABS: { id: Tab; label: string }[] = useMemo(
    () => [
      { id: "input", label: t("tabs.input") },
      { id: "structure", label: t("tabs.structure") },
      { id: "display", label: t("tabs.display") },
      { id: "source", label: t("tabs.source") },
    ],
    [t],
  );

  useEffect(() => {
    if (!leftTabRequest) return;
    setTab(leftTabRequest.tab);
    clearLeftTabRequest();
  }, [leftTabRequest, clearLeftTabRequest]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-card text-card-foreground">
      <div className="flex shrink-0 border-b border-border">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.id}
            type="button"
            onClick={() => setTab(tabDef.id)}
            className={`flex-1 border-b-2 py-2 font-mono text-[9px] uppercase tracking-[0.14em] ${
              tab === tabDef.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabDef.label}
          </button>
        ))}
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Keep all tabs mounted so search / hierarchy / display state survives tab switches */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            tab !== "input" && "hidden",
          )}
        >
          <InputWorkspacePanel />
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            tab !== "structure" && "hidden",
          )}
        >
          <StructureHierarchyPanel />
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            tab !== "display" && "hidden",
          )}
        >
          <VisualizationControlPanel />
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            tab !== "source" && "hidden",
          )}
        >
          <ProteinSourcePanel />
        </div>
      </div>
    </div>
  );
}
