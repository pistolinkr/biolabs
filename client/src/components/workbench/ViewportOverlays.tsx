import React from "react";

/**
 * Decorative overlays on the NGL canvas — orientation, scale cue, faint grid.
 * Mode / isolate / measure context lives in ViewportChrome (toolbar + bottom strip).
 */
export default function ViewportOverlays() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {/* Faint workstation grid */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #2A2A2A 1px, transparent 1px),
            linear-gradient(to bottom, #2A2A2A 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Axes — thin corner gnomon */}
      <div className="absolute left-3 top-3 font-mono text-[9px] leading-none tracking-tight text-[#6A6A6A]">
        <div className="flex items-end gap-1">
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden className="shrink-0 text-[#8A8A8A]">
            <line x1="4" y1="28" x2="28" y2="4" stroke="currentColor" strokeWidth="1" />
            <line x1="4" y1="28" x2="22" y2="28" stroke="#C89898" strokeWidth="1" />
            <line x1="4" y1="28" x2="4" y2="10" stroke="#98B8C8" strokeWidth="1" />
          </svg>
          <div className="flex flex-col gap-0.5 pb-0.5">
            <span className="text-[#C89898]">X</span>
            <span className="text-[#98C898]">Y</span>
            <span className="text-[#98B8C8]">Z</span>
          </div>
        </div>
      </div>

      {/* Scale cue — relative bar (exact Å requires stage bbox wiring) */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-0.5 text-[#7A7A7A]">
        <div className="h-px w-14 bg-[#4A4A4A]" />
        <span className="font-mono text-[8px] uppercase tracking-widest">Scale · scene</span>
      </div>
    </div>
  );
}
