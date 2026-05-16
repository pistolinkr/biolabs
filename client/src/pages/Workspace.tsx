import React, { useRef, useState } from 'react';
import WorkstationLayout from '@/components/WorkstationLayout';
import ViewportContainer from '@/components/ViewportContainer';
import LeftPanelTabs from '@/components/LeftPanelTabs';
import RightPanel from '@/components/RightPanel';
import PanelHeader from '@/components/PanelHeader';
import AppHeader from '@/components/AppHeader';
import CommandPalette from '@/components/CommandPalette';
import SettingsPanel from '@/components/SettingsPanel';
import ScientificHUD from '@/components/ScientificHUD';

import type { ProteinSelection } from '@/lib/proteinApis';

/**
 * Biolabs Workspace
 * 
 * Main application interface featuring:
 * - Left panel: Simulation controls and layer hierarchy
 * - Center: WebGL viewport for molecular visualization
 * - Right panel: Properties and metrics
 * - Bottom: Timeline and logs (optional)
 * - Header: Navigation and quick actions
 * - Command palette: Cmd+K for fast command execution
 * - Settings: Application configuration
 * - Scientific HUD: Real-time metrics overlay
 */
export default function Workspace() {
  const [showBottom, setShowBottom] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [proteinSelection, setProteinSelection] = useState<ProteinSelection | null>(null);
  const canvasHudBoundsRef = useRef<HTMLDivElement>(null);

  const bottomPanel = (
    <div className="flex flex-col h-full">
      <PanelHeader title="Timeline / Logs" />
      <div className="flex-1 panel-content">
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>[00:00:00] Simulation initialized</div>
          <div>[00:00:01] Protein loaded: 1,247 residues</div>
          <div>[00:00:02] Ligand docked successfully</div>
          <div>[00:00:05] Simulation started - 298K</div>
          <div className="text-accent">[00:00:10] Binding energy: -8.2 kcal/mol</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      <AppHeader
        onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      {proteinSelection ? (
        <div
          className="shrink-0 px-4 py-1.5 text-xs border-b border-border bg-secondary/80 text-muted-foreground"
          title={proteinSelection.label}
        >
          <span className="text-foreground font-medium">Selected</span>
          {' · '}
          <span className="uppercase">{proteinSelection.source}</span> {proteinSelection.id}
          {proteinSelection.pdbIds?.length ? (
            <span className="ml-2">PDB: {proteinSelection.pdbIds.slice(0, 5).join(', ')}</span>
          ) : null}
        </div>
      ) : null}
      <div className="flex-1 overflow-hidden">
        <WorkstationLayout
          leftPanel={<LeftPanelTabs onProteinSelect={setProteinSelection} />}
          centerPanel={
            <div ref={canvasHudBoundsRef} className="h-full w-full min-h-0 min-w-0">
              <ViewportContainer proteinSelection={proteinSelection} />
            </div>
          }
          rightPanel={<RightPanel />}
          bottomPanel={bottomPanel}
          showBottom={showBottom}
        />
      </div>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <ScientificHUD visible={true} position="top-right" canvasRef={canvasHudBoundsRef} />
    </div>
  );
}
