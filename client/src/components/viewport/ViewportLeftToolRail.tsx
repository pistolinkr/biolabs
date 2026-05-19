import {
  Camera,
  Download,
  Focus,
  Fullscreen,
  Maximize2,
  Orbit,
  Sun,
  SwitchCamera,
} from "lucide-react";
import React from "react";
import { useViewer } from "@/contexts/ViewerContext";
import { cn } from "@/lib/utils";

export function RailBtn({
  title,
  onClick,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center border border-[#2A2A2A] bg-[#111111] text-[#9A9A9A] transition-colors hover:border-[#4A4A4A] hover:text-[#F2F2F2]",
        active && "border-[#5A6A6A] text-[#F2F2F2]",
      )}
    >
      {children}
    </button>
  );
}

/** RCSB-style left vertical tool column (I/O, spin, fog — camera grouped in top bar). */
export default function ViewportLeftToolRail() {
  const { runViewerCommand, spinEnabled, renderOptions, setRenderOptions } = useViewer();

  return (
    <div className="flex w-11 shrink-0 flex-col gap-1 border-r border-[#2A2A2A] bg-[#0A0A0A] px-1.5 py-1.5">
      <RailBtn title="Reset camera" onClick={() => runViewerCommand("view.reset")}>
        <SwitchCamera className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn title="Fit structure" onClick={() => runViewerCommand("view.fit.structure")}>
        <Maximize2 className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn title="Fit selection / isolate" onClick={() => runViewerCommand("view.fit.selection")}>
        <Focus className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn title="Screenshot PNG" onClick={() => runViewerCommand("screenshot")}>
        <Camera className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn title="Export coordinates (remote)" onClick={() => runViewerCommand("export.cif")}>
        <Download className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn title="Fullscreen" onClick={() => runViewerCommand("view.fullscreen.toggle")}>
        <Fullscreen className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn title="Spin" active={spinEnabled} onClick={() => runViewerCommand("view.spin.toggle")}>
        <Orbit className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn
        title="Depth cue (fog)"
        active={renderOptions.depthCue}
        onClick={() => setRenderOptions({ depthCue: !renderOptions.depthCue })}
      >
        <Sun className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
    </div>
  );
}
