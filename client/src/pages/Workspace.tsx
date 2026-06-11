import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import WorkstationDockLayout from "@/components/WorkstationDockLayout";
import AIChatSheet from "@/components/assistant/AIChatSheet";
import ExplainPopover from "@/components/assistant/ExplainPopover";
import ResidueAnalysisPanel from "@/components/assistant/ResidueAnalysisPanel";
import ViewportOverlays from "@/components/workbench/ViewportOverlays";
import ContextualWorkflowBanner from "@/components/workbench/ContextualWorkflowBanner";
import WorkflowPipelineRail from "@/components/workbench/WorkflowPipelineRail";
import AppHeader from "@/components/AppHeader";
import CommandPalette from "@/components/CommandPalette";
import SettingsPanel from "@/components/SettingsPanel";
import ScientificHUD from "@/components/ScientificHUD";
import StructureViewport from "@/components/StructureViewport";
import ViewportChrome from "@/components/viewport/ViewportChrome";
import { AssistantProvider } from "@/contexts/AssistantContext";
import { ViewerProvider, useViewer } from "@/contexts/ViewerContext";
import { WorkflowProvider } from "@/contexts/WorkflowContext";

/**
 * Biolabs Workspace — computational biology workstation shell.
 */
export default function Workspace() {
  return (
    <ViewerProvider>
      <WorkflowProvider>
        <AssistantProvider>
          <WorkspaceChrome />
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
  const viewportShellRef = useRef<HTMLDivElement>(null);
  const canvasHudBoundsRef = useRef<HTMLDivElement>(null);

  const setViewportAndHudRef = (el: HTMLDivElement | null) => {
    viewportShellRef.current = el;
    setViewportShell(el);
  };

  return (
    <div className="workstation-shell flex h-screen max-h-screen flex-col overflow-hidden bg-background text-foreground">
      <AppHeader
        onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      <WorkflowPipelineRail />
      <ContextualWorkflowBanner />
      {proteinSelection ? (
        <div
          className="shrink-0 border-b border-border bg-card px-4 py-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
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
              ref={setViewportAndHudRef}
              className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden overscroll-y-none"
            >
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <ViewportChrome>
                  <div
                    ref={canvasHudBoundsRef}
                    className="relative h-full min-h-0 w-full overflow-hidden"
                  >
                    <StructureViewport className="absolute inset-0" />
                    <ViewportOverlays />
                    <ResidueAnalysisPanel />
                    <ScientificHUD
                      visible={true}
                      position="top-right"
                      canvasRef={canvasHudBoundsRef}
                      dockInsidePanel
                    />
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
