import React from "react";
import { cn } from "@/lib/utils";
import type { ResizeDirection } from "@/hooks/useFloatingPanelLayout";

type HandleProps = React.HTMLAttributes<HTMLDivElement>;

interface HandleSpec {
  dir: ResizeDirection;
  className: string;
  corner?: boolean;
}

const EDGE_SPECS: HandleSpec[] = [
  { dir: "n", className: "top-0 left-2 right-2 h-1.5 cursor-ns-resize" },
  { dir: "s", className: "bottom-0 left-2 right-2 h-1.5 cursor-ns-resize" },
  { dir: "w", className: "left-0 top-2 bottom-2 w-1.5 cursor-ew-resize" },
  { dir: "e", className: "right-0 top-2 bottom-2 w-1.5 cursor-ew-resize" },
];

const CORNER_SPECS: HandleSpec[] = [
  { dir: "nw", className: "top-0 left-0 size-3 cursor-nwse-resize", corner: true },
  { dir: "ne", className: "top-0 right-0 size-3 cursor-nesw-resize", corner: true },
  { dir: "sw", className: "bottom-0 left-0 size-3 cursor-nesw-resize", corner: true },
  { dir: "se", className: "bottom-0 right-0 size-3 cursor-nwse-resize", corner: true },
];

/**
 * Adobe-style resize border: invisible grab zones along all 4 edges and 4
 * corners. The bottom-right corner keeps a subtle visible grip for affordance.
 * Set axis="x" to expose only the left/right edges (e.g. collapsed panels).
 */
export default function FloatingPanelResizeHandles({
  getHandleProps,
  resizing,
  axis = "both",
  title,
}: {
  getHandleProps: (dir: ResizeDirection) => HandleProps;
  resizing?: boolean;
  axis?: "both" | "x";
  title?: string;
}) {
  const specs =
    axis === "x" ? EDGE_SPECS.filter((s) => s.dir === "e" || s.dir === "w") : [...EDGE_SPECS, ...CORNER_SPECS];

  return (
    <>
      {specs.map((spec) => {
        const isSe = spec.dir === "se";
        return (
          <div
            key={spec.dir}
            aria-label={isSe ? title : undefined}
            title={isSe ? title : undefined}
            className={cn(
              "absolute z-10 touch-none",
              spec.corner && "z-20",
              spec.className,
              isSe
                ? cn("floating-panel-handle-corner", resizing && "is-resizing")
                : cn("floating-panel-handle-edge", resizing && "is-resizing"),
            )}
            {...getHandleProps(spec.dir)}
          />
        );
      })}
    </>
  );
}
