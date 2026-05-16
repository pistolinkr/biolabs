import React, { ReactNode } from 'react';

interface WorkstationLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  bottomPanel?: ReactNode;
  showBottom?: boolean;
}

/**
 * Biolabs Workstation Layout
 * 
 * Implements a docking panel system inspired by professional tools:
 * - Left Panel (280px): Controls, hierarchy, datasets, layers
 * - Center Panel (flexible): WebGL viewport, molecular simulation
 * - Right Panel (320px): Properties, metrics, chain info
 * - Bottom Panel (200px, optional): Timeline, logs, console
 */
export default function WorkstationLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  bottomPanel,
  showBottom = false,
}: WorkstationLayoutProps) {
  return (
    <div className="workstation">
      {/* Left Panel */}
      <div className="panel-left">
        {leftPanel}
      </div>

      {/* Center and Right Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Section: Center + Right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Center Panel */}
          <div className="panel-center">
            {centerPanel}
          </div>

          {/* Right Panel */}
          <div className="panel-right">
            {rightPanel}
          </div>
        </div>

        {/* Bottom Panel (Optional) */}
        {showBottom && bottomPanel && (
          <div className="panel-bottom">
            {bottomPanel}
          </div>
        )}
      </div>
    </div>
  );
}
