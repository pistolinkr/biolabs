import React, { useRef, type ReactNode } from "react";
import ViewportSequenceDock from "@/components/workbench/ViewportSequenceDock";
import ViewportBottomInfoStrip from "@/components/viewport/ViewportBottomInfoStrip";
import ViewportLeftToolRail from "@/components/viewport/ViewportLeftToolRail";
import ViewportTopToolbar from "@/components/viewport/ViewportTopToolbar";
import SequenceDockResizeHandle from "@/components/viewport/SequenceDockResizeHandle";
import { useSequenceDockHeight } from "@/hooks/useSequenceDockHeight";

/**
 * RCSB-inspired viewport frame: top scientific toolbar, left tool rail, main canvas,
 * resizable dual sequence dock (protein + nucleic), then status rail.
 */
export default function ViewportChrome({ children }: { children: ReactNode }) {
  const columnRef = useRef<HTMLDivElement>(null);
  const { height, resizing, resizeHandleProps } = useSequenceDockHeight(columnRef);

  return (
    <div className="workbench-viewport-frame flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <ViewportTopToolbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
        <ViewportLeftToolRail />
        <div ref={columnRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
          <SequenceDockResizeHandle resizing={resizing} resizeHandleProps={resizeHandleProps} />
          <div
            className="flex min-h-0 shrink-0 flex-col overflow-hidden"
            style={{ height }}
          >
            <ViewportSequenceDock />
          </div>
        </div>
      </div>
      <ViewportBottomInfoStrip />
    </div>
  );
}
