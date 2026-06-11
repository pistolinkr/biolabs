import { DockviewDefaultTab, DockviewReact } from "dockview";
import type { DockviewApi, DockviewReadyEvent, IDockviewPanelProps } from "dockview";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import AIChatPanel from "@/components/assistant/AIChatPanel";
import LeftWorkstationPanel from "@/components/workbench/LeftWorkstationPanel";
import RightWorkstationPanel from "@/components/workbench/RightWorkstationPanel";
import { useLocale } from "@/contexts/LocaleContext";
import { i18n } from "@/i18n";

const LAYOUT_STORAGE_KEY = "biolabs.dockview.layout.v1";

const PANEL_LEFT = "workbench.left";
const PANEL_CENTER = "workbench.center";
const PANEL_RIGHT = "workbench.right";
const PANEL_ASSISTANT = "workbench.assistant";

const CenterSlotContext = createContext<React.ReactNode>(null);

function useCenterSlot() {
  return useContext(CenterSlotContext);
}

/** Close (×) removed; drag affordance is the three-line grip (styled in dockview-biolabs.css). */
function WorkbenchDockTab(props: React.ComponentProps<typeof DockviewDefaultTab>) {
  return <DockviewDefaultTab {...props} hideClose />;
}

function DockPanelLeft(_props: IDockviewPanelProps) {
  return (
    <div className="workbench-surface flex h-full min-h-0 flex-col overflow-hidden">
      <LeftWorkstationPanel />
    </div>
  );
}

function DockPanelCenter(_props: IDockviewPanelProps) {
  const slot = useCenterSlot();
  return <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden">{slot}</div>;
}

function DockPanelRight(_props: IDockviewPanelProps) {
  return (
    <div className="workbench-inspector-surface workbench-surface flex h-full min-h-0 flex-col overflow-hidden">
      <RightWorkstationPanel />
    </div>
  );
}

function DockPanelAssistant(_props: IDockviewPanelProps) {
  return (
    <div className="workbench-surface flex h-full min-h-0 flex-col overflow-hidden">
      <AIChatPanel />
    </div>
  );
}

function layoutHasCorePanels(api: DockviewApi): boolean {
  const ids = new Set(api.panels.map((p) => p.id));
  return ids.has(PANEL_LEFT) && ids.has(PANEL_CENTER) && ids.has(PANEL_RIGHT);
}

function dockPanelTitle(panelId: string): string {
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

function applyDockPanelTitles(api: DockviewApi): void {
  for (const panel of api.panels) {
    panel.api.setTitle(dockPanelTitle(panel.id));
  }
}

function createDefaultWorkbenchLayout(api: DockviewApi): void {
  api.clear();
  api.addPanel({
    id: PANEL_CENTER,
    component: PANEL_CENTER,
    title: dockPanelTitle(PANEL_CENTER),
  });
  api.addPanel({
    id: PANEL_LEFT,
    component: PANEL_LEFT,
    title: dockPanelTitle(PANEL_LEFT),
    position: { referencePanel: PANEL_CENTER, direction: "left" },
    initialWidth: 280,
  });
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

function tryRestoreLayout(api: DockviewApi): boolean {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return false;
    api.fromJSON(data as Parameters<DockviewApi["fromJSON"]>[0]);
    if (!layoutHasCorePanels(api)) {
      api.clear();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const dockComponents = {
  [PANEL_LEFT]: DockPanelLeft,
  [PANEL_CENTER]: DockPanelCenter,
  [PANEL_RIGHT]: DockPanelRight,
  [PANEL_ASSISTANT]: DockPanelAssistant,
} as const;

export interface WorkstationDockLayoutProps {
  centerContent: React.ReactNode;
}

/**
 * Photoshop-style dock: Data | Viewport | Inspector with tabs, splits, float, and persisted layout.
 */
export default function WorkstationDockLayout({ centerContent }: WorkstationDockLayoutProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const disposablesRef = useRef<Array<{ dispose: () => void }>>([]);
  const apiRef = useRef<DockviewApi | null>(null);
  const { resolvedLocale } = useLocale();

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    applyDockPanelTitles(api);
  }, [resolvedLocale]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      disposablesRef.current.forEach((d) => d.dispose());
      disposablesRef.current = [];
    },
    [],
  );

  const schedulePersist = useCallback((api: DockviewApi) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(api.toJSON()));
      } catch {
        /* quota / private mode */
      }
    }, 320);
  }, []);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      const { api } = event;
      apiRef.current = api;
      const restored = tryRestoreLayout(api);
      if (!restored) {
        createDefaultWorkbenchLayout(api);
        schedulePersist(api);
      } else {
        applyDockPanelTitles(api);
      }
      disposablesRef.current.push(api.onDidLayoutChange(() => schedulePersist(api)));
    },
    [schedulePersist],
  );

  const defaultTabComponent = useMemo(
    () => (props: React.ComponentProps<typeof DockviewDefaultTab>) => <WorkbenchDockTab {...props} />,
    [],
  );

  return (
    <CenterSlotContext.Provider value={centerContent}>
      <div
        className="workstation-dock-root dockview-theme-dark flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground"
      >
        <DockviewReact
          className="dockview-biolabs-host h-full min-h-0 w-full flex-1"
          components={dockComponents}
          defaultTabComponent={defaultTabComponent}
          onReady={onReady}
          tabGroupAccent="off"
          singleTabMode="fullwidth"
        />
      </div>
    </CenterSlotContext.Provider>
  );
}
