import React from "react";
import type { PhaeleonLayoutPresetId } from "@/lib/phaeleon/phaeleonLayoutPresets";

const stroke = "currentColor";
const fill = "currentColor";
const opacity = 0.35;
const strong = 0.55;

/** ASCII wireframe → SVG thumbnails reflecting panel proportions. */
export function PresetWireframe({ preset }: { preset: Exclude<PhaeleonLayoutPresetId, "custom"> }) {
  switch (preset) {
    case "binary":
      return (
        <svg viewBox="0 0 56 32" className="h-8 w-14 shrink-0 text-muted-foreground" aria-hidden="true">
          <rect x="0.5" y="0.5" width="55" height="31" fill="none" stroke={stroke} strokeWidth="1" />
          <rect x="1" y="1" width="9" height="30" fill={fill} opacity={opacity} />
          <rect x="11" y="1" width="44" height="30" fill={fill} opacity={strong} />
        </svg>
      );
    case "consult":
      return (
        <svg viewBox="0 0 56 32" className="h-8 w-14 shrink-0 text-muted-foreground" aria-hidden="true">
          <rect x="0.5" y="0.5" width="55" height="31" fill="none" stroke={stroke} strokeWidth="1" />
          <rect x="1" y="1" width="9" height="30" fill={fill} opacity={opacity} />
          <rect x="11" y="1" width="30" height="30" fill={fill} opacity={strong} />
          <rect x="42" y="1" width="13" height="30" fill={fill} opacity={opacity} />
        </svg>
      );
    case "classic":
    default:
      return (
        <svg viewBox="0 0 56 32" className="h-8 w-14 shrink-0 text-muted-foreground" aria-hidden="true">
          <rect x="0.5" y="0.5" width="55" height="31" fill="none" stroke={stroke} strokeWidth="1" />
          <rect x="1" y="1" width="11" height="30" fill={fill} opacity={opacity} />
          <rect x="13" y="1" width="28" height="30" fill={fill} opacity={strong} />
          <rect x="42" y="1" width="13" height="18" fill={fill} opacity={opacity} />
          <rect x="42" y="20" width="13" height="11" fill={fill} opacity={0.45} />
        </svg>
      );
  }
}
