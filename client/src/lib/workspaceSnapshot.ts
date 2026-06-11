import type { ProteinSelection } from "@/lib/proteinApis";
import { AI_SETTINGS_STORAGE_KEY, loadAiClientSettings } from "@/lib/ai/aiSettingsStorage";
import { loadLocalePreference } from "@/lib/localeStorage";
import type { VizColorSchemeId, VizRepresentationId } from "@/lib/nglRepr";
import type { ContextContactRadiusAngstrom } from "@/contexts/ViewerContext";

const WORKSPACE_KEY = "biolabs.workspace.v1";
const DOCK_LAYOUT_KEY = "biolabs.dockview.layout.v1";
const SNAPSHOT_EXPORT_KEY = "biolabs.workspace.snapshot.v1";

export interface WorkspaceViewerSnapshot {
  proteinSelection: ProteinSelection | null;
  representation: VizRepresentationId;
  colorScheme: VizColorSchemeId;
  isolateChainId: string | null;
  contextContactRadiusAngstrom: ContextContactRadiusAngstrom;
  selectedResidueKey: string | null;
}

export interface WorkspaceSnapshot {
  version: 1;
  savedAt: string;
  viewer: WorkspaceViewerSnapshot;
  dockLayout: unknown | null;
  aiSettings: ReturnType<typeof loadAiClientSettings>;
  theme: string | null;
  uiLocale: ReturnType<typeof loadLocalePreference>["uiLocale"];
}

export interface SaveWorkspaceInput {
  proteinSelection: ProteinSelection | null;
  representation: VizRepresentationId;
  colorScheme: VizColorSchemeId;
  isolateChainId: string | null;
  contextContactRadiusAngstrom: ContextContactRadiusAngstrom;
  selectedResidueKey: string | null;
}

function readJson(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function buildWorkspaceSnapshot(input: SaveWorkspaceInput): WorkspaceSnapshot {
  const persisted = readJson(WORKSPACE_KEY) as { proteinSelection?: ProteinSelection } | null;

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    viewer: {
      proteinSelection:
        input.proteinSelection?.source === "file"
          ? persisted?.proteinSelection ?? null
          : input.proteinSelection,
      representation: input.representation,
      colorScheme: input.colorScheme,
      isolateChainId: input.isolateChainId,
      contextContactRadiusAngstrom: input.contextContactRadiusAngstrom,
      selectedResidueKey: input.selectedResidueKey,
    },
    dockLayout: readJson(DOCK_LAYOUT_KEY),
    aiSettings: loadAiClientSettings(),
    theme: localStorage.getItem("theme"),
    uiLocale: loadLocalePreference().uiLocale,
  };
}

export function persistWorkspaceSnapshot(snapshot: WorkspaceSnapshot): void {
  localStorage.setItem(
    WORKSPACE_KEY,
    JSON.stringify({
      proteinSelection: snapshot.viewer.proteinSelection ?? undefined,
      representation: snapshot.viewer.representation,
      colorScheme: snapshot.viewer.colorScheme,
    }),
  );
  localStorage.setItem(SNAPSHOT_EXPORT_KEY, JSON.stringify(snapshot));
  if (snapshot.dockLayout) {
    localStorage.setItem(DOCK_LAYOUT_KEY, JSON.stringify(snapshot.dockLayout));
  }
  localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(snapshot.aiSettings));
}

export function downloadWorkspaceJson(snapshot: WorkspaceSnapshot): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = snapshot.savedAt.slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `biolabs-workspace-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
