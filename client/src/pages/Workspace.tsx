import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkstationDockLayout from "@/components/WorkstationDockLayout";
import AIChatSheet from "@/components/assistant/AIChatSheet";
import ExplainPopover from "@/components/assistant/ExplainPopover";
import ViewportAnalysisPanel from "@/components/assistant/ViewportAnalysisPanel";
import AppHeader from "@/components/AppHeader";
import CommandPalette from "@/components/CommandPalette";
import SettingsPanel from "@/components/SettingsPanel";
import StructureViewport from "@/components/StructureViewport";
import ViewportChrome from "@/components/viewport/ViewportChrome";
import { AssistantProvider } from "@/contexts/AssistantContext";
import { ViewerProvider, useViewer } from "@/contexts/ViewerContext";
import { WorkflowProvider } from "@/contexts/WorkflowContext";
import { WorkstationLayoutProvider, useWorkstationLayout } from "@/contexts/WorkstationLayoutContext";

/**
 * Biolabs Workspace — computational biology workstation shell.
 */
export default function Workspace() {
  return (
    <ViewerProvider>
      <WorkflowProvider>
        <AssistantProvider>
          <WorkstationLayoutProvider>
            <WorkspaceChrome />
          </WorkstationLayoutProvider>
        </AssistantProvider>
      </WorkflowProvider>
    </ViewerProvider>
  );
}

function WorkspaceChrome() {
  const { t } = useTranslation("common");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { proteinSelection, setViewportShell } = useViewer();
  const { density } = useWorkstationLayout();
  const setViewportRef = (el: HTMLDivElement | null) => {
    setViewportShell(el);
  };

  return (
    <div
      data-density={density}
      className="workstation-shell flex h-screen max-h-screen flex-col overflow-hidden bg-background text-foreground"
    >
      <AppHeader
        onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      {proteinSelection ? (
        <div
          className="shrink-0 bg-background px-4 py-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
          title={proteinSelection.label}
        >
          <span className="text-foreground">{t("loaded")}</span>
          {" · "}
          {proteinSelection.source} {proteinSelection.id}
          {proteinSelection.pdbIds?.length ? (
            <span className="ml-2 normal-case">PDB: {proteinSelection.pdbIds.slice(0, 5).join(", ")}</span>
          ) : null}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">
        <WorkstationDockLayout
          centerContent={
            <div
              ref={setViewportRef}
              className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden overscroll-y-none"
            >
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <ViewportChrome>
                  <div className="relative h-full min-h-0 w-full overflow-hidden">
                    <StructureViewport className="absolute inset-0" />
                    <ViewportAnalysisPanel />
                  </div>
                </ViewportChrome>
              </div>
            </div>
          }
        />
      </div>
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AIChatSheet />
      <ExplainPopover />
    </div>
  );
}
