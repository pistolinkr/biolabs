import React, { useRef } from "react";
import PhaeleonStackResizeHandle from "@/components/phaeleon/PhaeleonStackResizeHandle";
import { usePhaeleonAssistantStackHeight } from "@/hooks/usePhaeleonAssistantStackHeight";

/** Vertical split with a draggable boundary — secondary panel height is persisted by the caller. */
export default function PhaeleonResizableVerticalStack({
  primary,
  secondary,
  secondaryDockId,
  height,
  minSecondaryHeight,
  onHeightCommit,
}: {
  primary: React.ReactNode;
  secondary: React.ReactNode;
  secondaryDockId?: string;
  height: number;
  minSecondaryHeight: number;
  onHeightCommit: (height: number) => void;
}) {
  const stackRef = useRef<HTMLDivElement>(null);

  const { assistantHeight, resizing, resizeHandleProps } = usePhaeleonAssistantStackHeight({
    stackRef,
    height,
    minAssistantHeight: minSecondaryHeight,
    onHeightCommit,
  });

  return (
    <div
      ref={stackRef}
      className="grid min-h-0 overflow-hidden bg-card"
      style={{ gridTemplateRows: `minmax(0,1fr) auto ${assistantHeight}px` }}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">{primary}</div>
      <PhaeleonStackResizeHandle resizing={resizing} resizeHandleProps={resizeHandleProps} />
      <div id={secondaryDockId} className="flex min-h-0 flex-col overflow-hidden">
        {secondary}
      </div>
    </div>
  );
}
