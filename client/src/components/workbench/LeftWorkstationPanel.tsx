import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import InputWorkspacePanel from "@/components/workbench/InputWorkspacePanel";
import StructureHierarchyPanel from "@/components/workbench/StructureHierarchyPanel";
import ProteinSourcePanel from "@/components/workbench/ProteinSourcePanel";
import { cn } from "@/lib/utils";

type Tab = "input" | "structure" | "source";

export default function LeftWorkstationPanel() {
  const { t } = useTranslation("common");
  const [tab, setTab] = useState<Tab>("input");

  const TABS: { id: Tab; label: string }[] = [
    { id: "input", label: t("tabs.input") },
    { id: "structure", label: t("tabs.structure") },
    { id: "source", label: t("tabs.source") },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <div className="workbench-panel-nav">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.id}
            type="button"
            onClick={() => setTab(tabDef.id)}
            className={cn(
              "flex h-full flex-1 items-center justify-center font-mono text-[9px] uppercase tracking-[0.14em]",
              tab === tabDef.id
                ? "text-foreground underline decoration-foreground underline-offset-4"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tabDef.label}
          </button>
        ))}
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
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
            tab !== "source" && "hidden",
          )}
        >
          <ProteinSourcePanel />
        </div>
      </div>
    </div>
  );
}
