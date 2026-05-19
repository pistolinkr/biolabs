import { Layers, Palette, Ruler, Sparkles, Monitor } from "lucide-react";
import React from "react";
import { useViewer, type ContextContactRadiusAngstrom, type MeasurementMode } from "@/contexts/ViewerContext";
import type { VizColorSchemeId, VizRepresentationId } from "@/lib/nglRepr";
import { cn } from "@/lib/utils";

const REPR_ORDER: { id: VizRepresentationId; short: string }[] = [
  { id: "cartoon", short: "Ctn" },
  { id: "ribbon", short: "Rbn" },
  { id: "surface", short: "Srf" },
  { id: "ball+stick", short: "B&S" },
  { id: "line", short: "Wire" },
];

const CONTACT_RADIUS_PRESETS: ContextContactRadiusAngstrom[] = [4, 6, 10];

const COLOR_ORDER: { id: VizColorSchemeId; short: string }[] = [
  { id: "bfactor", short: "B" },
  { id: "bfactor_gray", short: "Conf" },
  { id: "residueindex", short: "Res" },
  { id: "electrostatic", short: "ES" },
];

function Seg({
  active,
  label,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap border px-2 py-1 font-mono text-[9px] uppercase tracking-wide",
        active
          ? "border-[#C8C8C8] bg-[#1C1C1C] text-[#F2F2F2]"
          : "border-[#2A2A2A] bg-[#111111] text-[#8A8A8A] hover:border-[#4A4A4A] hover:text-[#C8C8C8]",
      )}
    >
      {label}
    </button>
  );
}

/** RCSB-like dense top bar — representation, coloring, camera, measure, quality. */
export default function ViewportTopToolbar() {
  const {
    representation,
    setRepresentation,
    colorScheme,
    setColorScheme,
    runViewerCommand,
    measurementMode,
    setMeasurementMode,
    isolateChainId,
    setIsolateChainId,
    nglQuality,
    contextContactRadiusAngstrom,
    setContextContactRadiusAngstrom,
    polymerInteractionOverlayEnabled,
    nucleicBackboneAccentEnabled,
  } = useViewer();

  const cycleMeasure = () => {
    const order: MeasurementMode[] = ["none", "distance", "angle", "dihedral"];
    const i = order.indexOf(measurementMode);
    setMeasurementMode(order[(i + 1) % order.length]);
  };

  return (
    <div className="flex h-10 min-w-0 shrink-0 border-b border-[#2A2A2A] bg-[#0A0A0A]">
      <div
        className="no-scrollbar flex min-h-0 min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden overscroll-x-contain px-2.5"
        aria-label="Viewport toolbar — scroll horizontally for more controls"
      >
        <div className="mx-0.5 flex w-max flex-nowrap items-center gap-3 py-1.5 pr-1.5">
          <div className="flex shrink-0 items-center gap-1 pr-2">
            <Layers className="size-3.5 shrink-0 text-[#6A6A6A]" strokeWidth={1.25} />
            {REPR_ORDER.map((r) => (
              <Seg
                key={r.id}
                title={r.id}
                label={r.short}
                active={representation === r.id}
                onClick={() => setRepresentation(r.id)}
              />
            ))}
          </div>
          <div className="mx-1 h-5 w-px shrink-0 self-center bg-[#2A2A2A]" />
          <div className="flex shrink-0 items-center gap-1 pr-2">
            <Palette className="size-3.5 shrink-0 text-[#6A6A6A]" strokeWidth={1.25} />
            {COLOR_ORDER.map((c) => (
              <Seg
                key={c.id}
                title={c.id}
                label={c.short}
                active={colorScheme === c.id}
                onClick={() => setColorScheme(c.id)}
              />
            ))}
          </div>
          <div className="mx-1 h-5 w-px shrink-0 self-center bg-[#2A2A2A]" />
          <div className="flex shrink-0 items-center gap-1 pr-2">
            <span
              className="shrink-0 font-mono text-[8px] uppercase tracking-wide text-[#6A6A6A]"
              title="Distance-based polymer context (viewport pick or sequence)"
            >
              Ctx
            </span>
            {CONTACT_RADIUS_PRESETS.map((r) => (
              <Seg
                key={r}
                title={`Polymer context radius ${r} Å`}
                label={`${r}Å`}
                active={contextContactRadiusAngstrom === r}
                onClick={() => setContextContactRadiusAngstrom(r)}
              />
            ))}
          </div>
          <div className="mx-1 h-5 w-px shrink-0 self-center bg-[#2A2A2A]" />
          <div className="flex shrink-0 items-center gap-1 pr-2">
            <Seg
              title="Toggle heuristic protein–nucleic distance lines in context"
              label="Ixn"
              active={polymerInteractionOverlayEnabled}
              onClick={() => runViewerCommand("analysis.interactions")}
            />
            <Seg
              title="Toggle thin nucleic backbone line accent"
              label="Nt"
              active={nucleicBackboneAccentEnabled}
              onClick={() => runViewerCommand("view.preset.nucleic.accent")}
            />
          </div>
          <div className="mx-1 h-5 w-px shrink-0 self-center bg-[#2A2A2A]" />
          <button
            type="button"
            title="Readable preset: cartoon + chain colors + clear isolate"
            onClick={() => runViewerCommand("view.preset.readable")}
            className="mx-0.5 flex shrink-0 items-center gap-1 whitespace-nowrap border border-[#2A2A2A] bg-[#111111] px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-[#9A9A9A] hover:border-[#5A6A6A] hover:text-[#F2F2F2]"
          >
            <Sparkles className="size-3 shrink-0" strokeWidth={1.25} />
            Read
          </button>
          <div className="mx-1 h-5 w-px shrink-0 self-center bg-[#2A2A2A]" />
          <div className="flex shrink-0 items-center gap-1">
            <Seg title="Reset view" label="Rst" active={false} onClick={() => runViewerCommand("view.reset")} />
            <Seg title="Fit all" label="Fit" active={false} onClick={() => runViewerCommand("view.fit.structure")} />
            <Seg title="Fit isolate/selection" label="Sel" active={false} onClick={() => runViewerCommand("view.fit.selection")} />
          </div>
          <div className="mx-1 h-5 w-px shrink-0 self-center bg-[#2A2A2A]" />
          <button
            type="button"
            title="Cycle measurement — pick in viewport"
            onClick={cycleMeasure}
            className={cn(
              "mx-0.5 flex shrink-0 items-center gap-1 whitespace-nowrap border px-2 py-1 font-mono text-[9px] uppercase",
              measurementMode !== "none"
                ? "border-[#5A6A6A] bg-[#1C1C1C] text-[#F2F2F2]"
                : "border-[#2A2A2A] bg-[#111111] text-[#8A8A8A] hover:border-[#4A4A4A]",
            )}
          >
            <Ruler className="size-3 shrink-0" strokeWidth={1.25} />
            {measurementMode === "none" ? "Meas" : measurementMode}
          </button>
          <div className="mx-1 h-5 w-px shrink-0 self-center bg-[#2A2A2A]" />
          <button
            type="button"
            title="Renderer quality"
            onClick={() => runViewerCommand("view.quality.toggle")}
            className="mx-0.5 flex shrink-0 items-center gap-1 whitespace-nowrap border border-[#2A2A2A] bg-[#111111] px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-[#9A9A9A] hover:border-[#5A6A6A] hover:text-[#F2F2F2]"
          >
            <Monitor className="size-3 shrink-0" strokeWidth={1.25} />
            {nglQuality}
          </button>
          {isolateChainId ? (
            <>
              <div className="mx-1 h-5 w-px shrink-0 self-center bg-[#2A2A2A]" />
              <button
                type="button"
                onClick={() => setIsolateChainId(null)}
                className="mx-0.5 max-w-[7rem] shrink-0 truncate border border-[#5A5040] bg-[#141414] px-2 py-1 font-mono text-[9px] uppercase text-[#E0D8C8] hover:border-[#8A7A6A]"
                title="Clear chain isolate"
              >
                ISO {isolateChainId} ×
              </button>
            </>
          ) : null}
          <span className="shrink-0 self-center whitespace-nowrap pl-3 pr-0.5 font-mono text-[8px] uppercase tracking-widest text-[#5A5A5A]">
            ⌘K · palette
          </span>
        </div>
      </div>
    </div>
  );
}
