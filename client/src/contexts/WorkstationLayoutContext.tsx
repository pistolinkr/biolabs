import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DockviewApi } from "dockview";
import { applyLayoutPreset } from "@/lib/workstationPresets";
import {
  DEFAULT_DENSITY,
  DEFAULT_LAYOUT_PRESET,
  loadDensity,
  loadLayoutPreset,
  saveDensity,
  saveLayoutPreset,
  type LayoutPresetId,
  type WorkstationDensity,
} from "@/lib/workstationLayoutStorage";

interface WorkstationLayoutContextValue {
  activePreset: LayoutPresetId;
  density: WorkstationDensity;
  /** Called by the dock layout once dockview is ready. */
  registerApi: (api: DockviewApi) => void;
  /** Active preset id at ready time, for fresh (un-restored) initialization. */
  getActivePreset: () => LayoutPresetId;
  /** Switch to a preset and re-arrange the live dock. */
  setActivePreset: (preset: LayoutPresetId) => void;
  /** Re-apply the active preset (discards manual rearrangement). */
  resetToPreset: () => void;
  setDensity: (density: WorkstationDensity) => void;
}

const WorkstationLayoutContext = createContext<WorkstationLayoutContextValue | null>(null);

export const LAYOUT_PRESET_EVENT = "biolabs:applyLayoutPreset";
export const LAYOUT_RESET_EVENT = "biolabs:resetLayout";

export function WorkstationLayoutProvider({ children }: { children: React.ReactNode }) {
  const [activePreset, setActivePresetState] = useState<LayoutPresetId>(DEFAULT_LAYOUT_PRESET);
  const [density, setDensityState] = useState<WorkstationDensity>(DEFAULT_DENSITY);
  const apiRef = useRef<DockviewApi | null>(null);
  const activePresetRef = useRef<LayoutPresetId>(activePreset);

  useEffect(() => {
    setActivePresetState(loadLayoutPreset());
    setDensityState(loadDensity());
  }, []);

  useEffect(() => {
    activePresetRef.current = activePreset;
  }, [activePreset]);

  const registerApi = useCallback((api: DockviewApi) => {
    apiRef.current = api;
  }, []);

  const getActivePreset = useCallback(() => activePresetRef.current, []);

  const setActivePreset = useCallback((preset: LayoutPresetId) => {
    activePresetRef.current = preset;
    setActivePresetState(preset);
    saveLayoutPreset(preset);
    const api = apiRef.current;
    if (api) applyLayoutPreset(api, preset);
  }, []);

  const resetToPreset = useCallback(() => {
    const api = apiRef.current;
    if (api) applyLayoutPreset(api, activePresetRef.current);
  }, []);

  const setDensity = useCallback((next: WorkstationDensity) => {
    setDensityState(next);
    saveDensity(next);
  }, []);

  useEffect(() => {
    const onApplyPreset = (e: Event) => {
      const detail = (e as CustomEvent<LayoutPresetId>).detail;
      if (detail) setActivePreset(detail);
    };
    const onReset = () => resetToPreset();
    window.addEventListener(LAYOUT_PRESET_EVENT, onApplyPreset as EventListener);
    window.addEventListener(LAYOUT_RESET_EVENT, onReset);
    return () => {
      window.removeEventListener(LAYOUT_PRESET_EVENT, onApplyPreset as EventListener);
      window.removeEventListener(LAYOUT_RESET_EVENT, onReset);
    };
  }, [setActivePreset, resetToPreset]);

  const value = useMemo<WorkstationLayoutContextValue>(
    () => ({
      activePreset,
      density,
      registerApi,
      getActivePreset,
      setActivePreset,
      resetToPreset,
      setDensity,
    }),
    [activePreset, density, registerApi, getActivePreset, setActivePreset, resetToPreset, setDensity],
  );

  return (
    <WorkstationLayoutContext.Provider value={value}>{children}</WorkstationLayoutContext.Provider>
  );
}

export function useWorkstationLayout(): WorkstationLayoutContextValue {
  const ctx = useContext(WorkstationLayoutContext);
  if (!ctx) {
    throw new Error("useWorkstationLayout must be used within WorkstationLayoutProvider");
  }
  return ctx;
}
