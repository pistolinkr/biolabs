import React, { type ReactNode } from "react";
import ViewportSequenceDock from "@/components/workbench/ViewportSequenceDock";
import ViewportBottomInfoStrip from "@/components/viewport/ViewportBottomInfoStrip";
import ViewportLeftToolRail from "@/components/viewport/ViewportLeftToolRail";
import ViewportTopToolbar from "@/components/viewport/ViewportTopToolbar";

/**
 * RCSB-inspired viewport frame: top scientific toolbar, left tool rail, main canvas,
 * dual sequence dock (protein + nucleic), then status rail.
 */
export default function ViewportChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border border-border bg-[var(--viewport-background)]">
      <ViewportTopToolbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
        <ViewportLeftToolRail />
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
      <ViewportSequenceDock />
      <ViewportBottomInfoStrip />
    </div>
  );
}
