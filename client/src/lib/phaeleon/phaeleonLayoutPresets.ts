import type { PhaeleonClientSettings } from "./phaeleonSettingsStorage";

export type PhaeleonLayoutPresetId = "binary" | "consult" | "classic" | "custom";

export type PhaeleonLayoutStructure = "binaryCanvas" | "consultSplit" | "classicStack";

export interface PhaeleonLayoutPreset {
  id: Exclude<PhaeleonLayoutPresetId, "custom">;
  structure: PhaeleonLayoutStructure;
  inputColumnWidth: number;
  rightColumnWidth: number;
  stackSecondaryHeight: number;
}

export const PHAELEON_LAYOUT_PRESET_IDS: Exclude<PhaeleonLayoutPresetId, "custom">[] = [
  "binary",
  "consult",
  "classic",
];

export const PHAELEON_LAYOUT_PRESETS: Record<Exclude<PhaeleonLayoutPresetId, "custom">, PhaeleonLayoutPreset> = {
  binary: {
    id: "binary",
    structure: "binaryCanvas",
    inputColumnWidth: 220,
    rightColumnWidth: 320,
    stackSecondaryHeight: 300,
  },
  consult: {
    id: "consult",
    structure: "consultSplit",
    inputColumnWidth: 220,
    rightColumnWidth: 320,
    stackSecondaryHeight: 300,
  },
  classic: {
    id: "classic",
    structure: "classicStack",
    inputColumnWidth: 280,
    rightColumnWidth: 320,
    stackSecondaryHeight: 300,
  },
};

export function phaeleonPresetStructureLabel(preset: PhaeleonLayoutPreset): string {
  switch (preset.structure) {
    case "binaryCanvas":
      return `${preset.inputColumnWidth} · report canvas`;
    case "consultSplit":
      return `${preset.inputColumnWidth} · report · AI ${preset.rightColumnWidth}`;
    case "classicStack":
    default:
      return `${preset.inputColumnWidth} · report · Insp ${preset.rightColumnWidth} · AI ${preset.stackSecondaryHeight}`;
  }
}

export function applyPhaeleonLayoutPreset(
  presetId: Exclude<PhaeleonLayoutPresetId, "custom">,
): Pick<
  PhaeleonClientSettings,
  | "layoutPreset"
  | "layoutStructure"
  | "inputColumnWidth"
  | "rightColumnWidth"
  | "stackSecondaryHeight"
  | "assistantPanelOpen"
  | "autoAnalyzeOnPair"
> {
  const preset = PHAELEON_LAYOUT_PRESETS[presetId];
  return {
    layoutPreset: presetId,
    layoutStructure: preset.structure,
    inputColumnWidth: preset.inputColumnWidth,
    rightColumnWidth: preset.rightColumnWidth,
    stackSecondaryHeight: preset.stackSecondaryHeight,
    assistantPanelOpen: presetId !== "binary",
    autoAnalyzeOnPair: false,
  };
}

export function inferPhaeleonLayoutPreset(settings: PhaeleonClientSettings): PhaeleonLayoutPresetId {
  if (settings.layoutPreset !== "custom") return settings.layoutPreset;

  for (const id of PHAELEON_LAYOUT_PRESET_IDS) {
    const preset = PHAELEON_LAYOUT_PRESETS[id];
    if (
      settings.layoutStructure === preset.structure &&
      settings.inputColumnWidth === preset.inputColumnWidth &&
      settings.rightColumnWidth === preset.rightColumnWidth &&
      settings.stackSecondaryHeight === preset.stackSecondaryHeight
    ) {
      return id;
    }
  }
  return "custom";
}

/** Map legacy preset ids to the current three-preset system. */
export function migrateLegacyPhaeleonPresetId(v: unknown): Exclude<PhaeleonLayoutPresetId, "custom"> | null {
  if (v === "input" || v === "focus" || v === "assistant" || v === "compact") return "binary";
  if (v === "analysis" || v === "command") return "consult";
  if (v === "binary" || v === "consult" || v === "classic") return v;
  return null;
}

export function migrateLegacyPhaeleonStructure(v: unknown): PhaeleonLayoutStructure | null {
  if (v === "inspectorStack") return "classicStack";
  if (v === "assistantStack" || v === "compactColumn") return "binaryCanvas";
  if (v === "analysisStack" || v === "commandParallel") return "consultSplit";
  if (v === "binaryCanvas" || v === "consultSplit" || v === "classicStack") {
    return v;
  }
  return null;
}
