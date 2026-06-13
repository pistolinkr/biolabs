import type { DockviewApi } from "dockview";
import { i18n } from "@/i18n";
import type { LayoutPresetId } from "@/lib/workstationLayoutStorage";

export const PANEL_LEFT = "workbench.left";
export const PANEL_CENTER = "workbench.center";
export const PANEL_RIGHT = "workbench.right";
export const PANEL_ASSISTANT = "workbench.assistant";

export function dockPanelTitle(panelId: string): string {
  switch (panelId) {
    case PANEL_LEFT:
      return i18n.t("dock.data", { ns: "common" });
    case PANEL_CENTER:
      return i18n.t("dock.viewport", { ns: "common" });
    case PANEL_RIGHT:
      return i18n.t("dock.inspector", { ns: "common" });
    case PANEL_ASSISTANT:
      return i18n.t("dock.assistant", { ns: "common" });
    default:
      return panelId;
  }
}

export function applyDockPanelTitles(api: DockviewApi): void {
  for (const panel of api.panels) {
    panel.api.setTitle(dockPanelTitle(panel.id));
  }
}

export function layoutHasCorePanels(api: DockviewApi): boolean {
  const ids = new Set(api.panels.map((p) => p.id));
  return ids.has(PANEL_LEFT) && ids.has(PANEL_CENTER) && ids.has(PANEL_RIGHT);
}

function addCenter(api: DockviewApi): void {
  api.addPanel({
    id: PANEL_CENTER,
    component: PANEL_CENTER,
    title: dockPanelTitle(PANEL_CENTER),
  });
}

function addLeft(api: DockviewApi, width: number): void {
  api.addPanel({
    id: PANEL_LEFT,
    component: PANEL_LEFT,
    title: dockPanelTitle(PANEL_LEFT),
    position: { referencePanel: PANEL_CENTER, direction: "left" },
    initialWidth: width,
  });
}

/** Classic: Data | Viewport | Inspector, with Assistant docked below Inspector. */
function buildClassic(api: DockviewApi): void {
  addCenter(api);
  addLeft(api, 280);
  api.addPanel({
    id: PANEL_RIGHT,
    component: PANEL_RIGHT,
    title: dockPanelTitle(PANEL_RIGHT),
    position: { referencePanel: PANEL_CENTER, direction: "right" },
    initialWidth: 320,
  });
  api.addPanel({
    id: PANEL_ASSISTANT,
    component: PANEL_ASSISTANT,
    title: dockPanelTitle(PANEL_ASSISTANT),
    position: { referencePanel: PANEL_RIGHT, direction: "below" },
    initialHeight: 300,
  });
}

/** Slim side columns; Assistant stacked below Inspector (no tab bar). */
function buildSideColumns(api: DockviewApi, leftWidth: number, rightWidth: number, assistantHeight = 240): void {
  addCenter(api);
  addLeft(api, leftWidth);
  api.addPanel({
    id: PANEL_RIGHT,
    component: PANEL_RIGHT,
    title: dockPanelTitle(PANEL_RIGHT),
    position: { referencePanel: PANEL_CENTER, direction: "right" },
    initialWidth: rightWidth,
  });
  api.addPanel({
    id: PANEL_ASSISTANT,
    component: PANEL_ASSISTANT,
    title: dockPanelTitle(PANEL_ASSISTANT),
    position: { referencePanel: PANEL_RIGHT, direction: "below" },
    initialHeight: assistantHeight,
  });
}

/** Assistant-first: Assistant occupies a tall right region, Inspector docked beneath it. */
function buildAssistantFirst(api: DockviewApi): void {
  addCenter(api);
  addLeft(api, 240);
  api.addPanel({
    id: PANEL_ASSISTANT,
    component: PANEL_ASSISTANT,
    title: dockPanelTitle(PANEL_ASSISTANT),
    position: { referencePanel: PANEL_CENTER, direction: "right" },
    initialWidth: 360,
  });
  api.addPanel({
    id: PANEL_RIGHT,
    component: PANEL_RIGHT,
    title: dockPanelTitle(PANEL_RIGHT),
    position: { referencePanel: PANEL_ASSISTANT, direction: "below" },
    initialHeight: 260,
  });
}

/** Apply a named layout preset, clearing any existing arrangement first. */
export function applyLayoutPreset(api: DockviewApi, preset: LayoutPresetId): void {
  api.clear();
  switch (preset) {
    case "focus":
      buildSideColumns(api, 220, 260, 220);
      break;
    case "analysis":
      buildSideColumns(api, 240, 440, 260);
      break;
    case "assistant":
      buildAssistantFirst(api);
      break;
    case "compact":
      buildSideColumns(api, 210, 250, 200);
      break;
    case "classic":
    default:
      buildClassic(api);
      break;
  }
  applyDockPanelTitles(api);
  hideAllGroupHeaders(api);
}

/** Hide dock tab bars — layout is preset-driven, panel labels live in panel chrome. */
export function hideAllGroupHeaders(api: DockviewApi): void {
  for (const group of api.groups) {
    group.header.hidden = true;
  }
}
