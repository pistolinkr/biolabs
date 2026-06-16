import {
  PHAELEON_LAYOUT_PRESETS,
  inferPhaeleonLayoutPreset,
  type PhaeleonLayoutPresetId,
  type PhaeleonLayoutStructure,
} from "./phaeleonLayoutPresets";
import type { PhaeleonClientSettings } from "./phaeleonSettingsStorage";

export function layoutStructureOf(
  settings: Pick<PhaeleonClientSettings, "layoutPreset" | "layoutStructure">,
): PhaeleonLayoutStructure {
  if (settings.layoutPreset !== "custom") {
    return PHAELEON_LAYOUT_PRESETS[settings.layoutPreset].structure;
  }
  return settings.layoutStructure;
}

export function isBinaryLayout(settings: Pick<PhaeleonClientSettings, "layoutPreset" | "layoutStructure">): boolean {
  return layoutStructureOf(settings) === "binaryCanvas";
}

export function isConsultLayout(settings: Pick<PhaeleonClientSettings, "layoutPreset" | "layoutStructure">): boolean {
  return layoutStructureOf(settings) === "consultSplit";
}

export function isClassicLayout(settings: Pick<PhaeleonClientSettings, "layoutPreset" | "layoutStructure">): boolean {
  return layoutStructureOf(settings) === "classicStack";
}

export function layoutShowsPersistentAi(
  settings: Pick<PhaeleonClientSettings, "layoutPreset" | "layoutStructure">,
): boolean {
  const structure = layoutStructureOf(settings);
  return structure === "consultSplit" || structure === "classicStack";
}

export function effectiveLayoutPreset(
  settings: PhaeleonClientSettings,
): Exclude<PhaeleonLayoutPresetId, "custom"> {
  if (settings.layoutPreset !== "custom") return settings.layoutPreset;
  const inferred = inferPhaeleonLayoutPreset(settings);
  return inferred === "custom" ? "binary" : inferred;
}
