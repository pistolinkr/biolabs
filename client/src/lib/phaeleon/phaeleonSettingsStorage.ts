import type { PhaeleonLayoutPresetId, PhaeleonLayoutStructure } from "./phaeleonLayoutPresets";
import {
  PHAELEON_LAYOUT_PRESETS,
  applyPhaeleonLayoutPreset,
  migrateLegacyPhaeleonPresetId,
  migrateLegacyPhaeleonStructure,
} from "./phaeleonLayoutPresets";

export const PHAELEON_SETTINGS_STORAGE_KEY = "biolabs.phaeleon.settings.v6";

export type HelixAnalysisMode = "rules" | "rules_and_ai";

export interface PhaeleonClientSettings {
  layoutPreset: PhaeleonLayoutPresetId;
  layoutStructure: PhaeleonLayoutStructure;
  inputColumnWidth: number;
  rightColumnWidth: number;
  stackSecondaryHeight: number;
  assistantPanelOpen: boolean;
  autoAnalyzeOnPair: boolean;
  analysisMode: HelixAnalysisMode;
  fuzzySearchEnabled: boolean;
  autoOpenChatOnAnalyze: boolean;
}

export const PHAELEON_INPUT_MIN = 210;
export const PHAELEON_INPUT_MAX = 360;
export const PHAELEON_INPUT_DEFAULT = 280;
export const PHAELEON_RIGHT_MIN = 250;
export const PHAELEON_RIGHT_MAX = 440;
export const PHAELEON_RIGHT_DEFAULT = 320;
export const PHAELEON_STACK_MIN = 200;
export const PHAELEON_STACK_MAX = 480;
export const PHAELEON_STACK_DEFAULT = 300;
/** Focus preset — center-column assistant dock (user-resizable). */
export const PHAELEON_FOCUS_STACK_MIN = 260;
export const PHAELEON_FOCUS_STACK_MAX = 560;
export const PHAELEON_FOCUS_STACK_DEFAULT = 280;

const DEFAULT_BINARY = applyPhaeleonLayoutPreset("binary");

export const DEFAULT_PHAELEON_CLIENT_SETTINGS: PhaeleonClientSettings = {
  ...DEFAULT_BINARY,
  autoAnalyzeOnPair: false,
  analysisMode: "rules",
  fuzzySearchEnabled: true,
  autoOpenChatOnAnalyze: false,
};

const LEGACY_STORAGE_KEYS = [
  "biolabs.phaeleon.settings.v4",
  "biolabs.phaeleon.settings.v3",
  "biolabs.phaeleon.settings.v2",
  "biolabs.phaeleon.settings.v1",
];

function isLayoutStructure(v: unknown): v is PhaeleonLayoutStructure {
  return v === "binaryCanvas" || v === "consultSplit" || v === "classicStack";
}

function isLayoutPreset(v: unknown): v is PhaeleonLayoutPresetId {
  return (
    v === "binary" ||
    v === "consult" ||
    v === "classic" ||
    v === "custom" ||
    v === "command" ||
    v === "compact" ||
    v === "focus" ||
    v === "analysis" ||
    v === "assistant" ||
    v === "input"
  );
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== "number" || Number.isNaN(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function clampStackSecondaryHeight(
  height: unknown,
  structure: PhaeleonLayoutStructure,
): number {
  return clampInt(height, PHAELEON_STACK_MIN, PHAELEON_STACK_MAX, PHAELEON_STACK_DEFAULT);
}

function migrateLegacySettings(o: Partial<PhaeleonClientSettings & Record<string, unknown>>): PhaeleonClientSettings {
  const migratedPreset = migrateLegacyPhaeleonPresetId(o.layoutPreset) ?? "binary";
  const layoutPreset: PhaeleonLayoutPresetId =
    o.layoutPreset === "custom" ? "custom" : migratedPreset;
  const migratedStructure =
    migrateLegacyPhaeleonStructure(o.layoutStructure) ??
    (isLayoutStructure(o.layoutStructure) ? o.layoutStructure : PHAELEON_LAYOUT_PRESETS[migratedPreset].structure);

  const hasNewShape =
    typeof o.rightColumnWidth === "number" && typeof o.stackSecondaryHeight === "number";

  if (hasNewShape) {
    const settings: PhaeleonClientSettings = {
      layoutPreset,
      layoutStructure: migratedStructure,
      inputColumnWidth: clampInt(o.inputColumnWidth, PHAELEON_INPUT_MIN, PHAELEON_INPUT_MAX, PHAELEON_INPUT_DEFAULT),
      rightColumnWidth: clampInt(o.rightColumnWidth, PHAELEON_RIGHT_MIN, PHAELEON_RIGHT_MAX, PHAELEON_RIGHT_DEFAULT),
      stackSecondaryHeight: clampStackSecondaryHeight(o.stackSecondaryHeight, migratedStructure),
      assistantPanelOpen: true,
      autoAnalyzeOnPair: o.autoAnalyzeOnPair === true,
      analysisMode: o.analysisMode === "rules_and_ai" ? "rules_and_ai" : "rules",
      fuzzySearchEnabled: o.fuzzySearchEnabled !== false,
      autoOpenChatOnAnalyze: o.autoOpenChatOnAnalyze === true,
    };

    if (layoutPreset !== "custom") {
      return { ...settings, ...applyPhaeleonLayoutPreset(layoutPreset) };
    }
    return settings;
  }

  // v4 flat four-column → map to closest stacked preset by id
  if (layoutPreset !== "custom") {
    return {
      ...DEFAULT_PHAELEON_CLIENT_SETTINGS,
      ...applyPhaeleonLayoutPreset(migratedPreset),
      autoAnalyzeOnPair: o.autoAnalyzeOnPair === true,
      analysisMode: o.analysisMode === "rules_and_ai" ? "rules_and_ai" : "rules",
      fuzzySearchEnabled: o.fuzzySearchEnabled !== false,
      autoOpenChatOnAnalyze: o.autoOpenChatOnAnalyze === true,
    };
  }

  const inspectorWidth = clampInt(
    o.inspectorColumnWidth as number | undefined,
    PHAELEON_RIGHT_MIN,
    PHAELEON_RIGHT_MAX,
    PHAELEON_RIGHT_DEFAULT,
  );
  const assistantWidth = clampInt(
    o.assistantColumnWidth as number | undefined,
    PHAELEON_STACK_MIN,
    PHAELEON_STACK_MAX,
    PHAELEON_STACK_DEFAULT,
  );

  return {
    layoutPreset: "custom",
    layoutStructure: "classicStack",
    inputColumnWidth: clampInt(o.inputColumnWidth, PHAELEON_INPUT_MIN, PHAELEON_INPUT_MAX, PHAELEON_INPUT_DEFAULT),
    rightColumnWidth: inspectorWidth,
    stackSecondaryHeight: assistantWidth,
    assistantPanelOpen: true,
    autoAnalyzeOnPair: o.autoAnalyzeOnPair === true,
    analysisMode: o.analysisMode === "rules_and_ai" ? "rules_and_ai" : "rules",
    fuzzySearchEnabled: o.fuzzySearchEnabled !== false,
    autoOpenChatOnAnalyze: o.autoOpenChatOnAnalyze === true,
  };
}

export function loadPhaeleonClientSettings(): PhaeleonClientSettings {
  if (typeof window === "undefined") return { ...DEFAULT_PHAELEON_CLIENT_SETTINGS };
  try {
    let raw = localStorage.getItem(PHAELEON_SETTINGS_STORAGE_KEY);
    if (!raw) {
      for (const key of LEGACY_STORAGE_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
    }
    if (!raw) return { ...DEFAULT_PHAELEON_CLIENT_SETTINGS };

    const o = JSON.parse(raw) as Partial<PhaeleonClientSettings & Record<string, unknown>>;
    if (!isLayoutPreset(o.layoutPreset)) {
      return { ...DEFAULT_PHAELEON_CLIENT_SETTINGS };
    }

    return migrateLegacySettings(o);
  } catch {
    return { ...DEFAULT_PHAELEON_CLIENT_SETTINGS };
  }
}

export function savePhaeleonClientSettings(settings: PhaeleonClientSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PHAELEON_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* quota */
  }
}

export function resetPhaeleonClientSettings(): PhaeleonClientSettings {
  return { ...DEFAULT_PHAELEON_CLIENT_SETTINGS };
}
