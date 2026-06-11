import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { emitWorkflowRuntimeEvent } from "@/core/events/workflowRuntime";
import { mergeStageStatusesWithJobs } from "@/core/workflow/mergeStageStatuses";
import {
  applyOrchestrationPatch,
  getOrchestrationSnapshot,
  subscribeOrchestration,
  type WorkflowJobClient,
} from "@/core/workflow/orchestrationStore";
import {
  WORKFLOW_STAGES,
  type LeftWorkbenchTab,
  type WorkflowStageId,
  type WorkflowStageStatus,
} from "@/core/workflow/stageTypes";
import { useViewer } from "@/contexts/ViewerContext";
import { useTranslation } from "react-i18next";

export type { LeftWorkbenchTab, WorkflowStageId, WorkflowStageStatus };
export { WORKFLOW_STAGES };

const STAGE_TO_LEFT_TAB: Partial<Record<WorkflowStageId, LeftWorkbenchTab>> = {
  input: "input",
  ai_pipeline: "source",
  folding: "source",
  analysis: "structure",
  reasoning: "structure",
  visualization: "display",
  simulation: "structure",
  engineering: "input",
};

function stageStatusHeuristic(
  id: WorkflowStageId,
  hasSelection: boolean,
  hasStructureModel: boolean,
  isPredicted: boolean,
): WorkflowStageStatus {
  switch (id) {
    case "input":
      return hasSelection ? "complete" : "ready";
    case "ai_pipeline":
      if (!hasSelection) return "locked";
      return hasStructureModel ? "complete" : "pending";
    case "folding":
      if (!hasSelection) return "locked";
      if (isPredicted) return hasStructureModel ? "complete" : "pending";
      return hasStructureModel ? "complete" : "ready";
    case "analysis":
    case "visualization":
      if (!hasSelection) return "locked";
      return hasStructureModel ? "complete" : "pending";
    case "reasoning":
      if (!hasStructureModel) return "locked";
      return "pending";
    case "simulation":
    case "engineering":
      if (!hasStructureModel) return "locked";
      return "pending";
    default:
      return "pending";
  }
}

interface WorkflowContextValue {
  stages: typeof WORKFLOW_STAGES;
  focusedStage: WorkflowStageId;
  setFocusedStage: (id: WorkflowStageId) => void;
  focusStage: (id: WorkflowStageId) => void;
  leftTabRequest: { tab: LeftWorkbenchTab; nonce: number } | null;
  clearLeftTabRequest: () => void;
  /** Merged: Viewer-derived heuristic + optional job queue overlay. */
  stageStatuses: Record<WorkflowStageId, WorkflowStageStatus>;
  /** Heuristic-only (no job overlay) — for debug / docs. */
  heuristicStageStatuses: Record<WorkflowStageId, WorkflowStageStatus>;
  suggestedStage: WorkflowStageId;
  contextualHint: string;
  /** Orchestration slice — job API poll */
  orchestrationConnected: boolean;
  orchestrationPollError: string | null;
  queueDepth: number;
  runningJobs: WorkflowJobClient[];
  lastPipelineError: string | null;
  /** Short note for Inspector: derived vs server */
  workflowSourceSummary: string;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

function deriveSuggestedStage(hasSelection: boolean, hasStructureModel: boolean): WorkflowStageId {
  if (!hasSelection) return "input";
  if (!hasStructureModel) return "ai_pipeline";
  return "analysis";
}

function buildHint(
  hasSelection: boolean,
  hasStructureModel: boolean,
  isPredicted: boolean,
  t: (key: string) => string,
): string {
  if (!hasSelection) return t("hints.noSelection");
  if (!hasStructureModel) return t("hints.resolving");
  if (isPredicted) return t("hints.predicted");
  return t("hints.experimental");
}

export function WorkflowProvider({ children }: { children: ReactNode }) {
  return <WorkflowProviderInner>{children}</WorkflowProviderInner>;
}

function WorkflowProviderInner({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation("workflow");
  const { proteinSelection, structureModel } = useViewer();
  const hasSelection = proteinSelection != null;
  const hasStructureModel = structureModel != null;
  const isPredicted =
    proteinSelection?.preferredStructure === "alphafold" ||
    /\balphafold\b/i.test(proteinSelection?.label ?? "");

  const heuristicStageStatuses = useMemo(() => {
    const o = {} as Record<WorkflowStageId, WorkflowStageStatus>;
    for (const s of WORKFLOW_STAGES) {
      o[s.id] = stageStatusHeuristic(s.id, hasSelection, hasStructureModel, isPredicted);
    }
    return o;
  }, [hasSelection, hasStructureModel, isPredicted]);

  const orch = useSyncExternalStore(subscribeOrchestration, getOrchestrationSnapshot, getOrchestrationSnapshot);

  const stageStatuses = useMemo(
    () =>
      orch.connected
        ? mergeStageStatusesWithJobs(heuristicStageStatuses, orch.jobs)
        : { ...heuristicStageStatuses },
    [heuristicStageStatuses, orch.connected, orch.jobs, orch.pollGeneration],
  );

  useEffect(() => {
    emitWorkflowRuntimeEvent({
      type: "viewer:context",
      hasSelection,
      hasStructureModel,
      isPredicted,
    });
  }, [hasSelection, hasStructureModel, isPredicted]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const r = await fetch("/api/workflow/status", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as {
          connected?: boolean;
          jobs?: WorkflowJobClient[];
          queueDepth?: number;
          lastPipelineError?: string | null;
        };
        if (cancelled) return;
        applyOrchestrationPatch({
          connected: data.connected !== false,
          jobs: Array.isArray(data.jobs) ? data.jobs : [],
          queueDepth: typeof data.queueDepth === "number" ? data.queueDepth : 0,
          lastPipelineError: data.lastPipelineError ?? null,
          lastPollError: null,
        });
        emitWorkflowRuntimeEvent({
          type: "workflow:poll",
          connected: data.connected !== false,
          queueDepth: typeof data.queueDepth === "number" ? data.queueDepth : 0,
          jobCount: Array.isArray(data.jobs) ? data.jobs.length : 0,
        });
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "poll failed";
        applyOrchestrationPatch({
          connected: false,
          jobs: [],
          queueDepth: 0,
          lastPollError: message,
        });
        emitWorkflowRuntimeEvent({ type: "workflow:poll-error", message });
      }
    };

    void tick();
    const id = window.setInterval(tick, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const suggestedStage = useMemo(
    () => deriveSuggestedStage(hasSelection, hasStructureModel),
    [hasSelection, hasStructureModel],
  );

  const contextualHint = useMemo(
    () => buildHint(hasSelection, hasStructureModel, isPredicted, t),
    [hasSelection, hasStructureModel, isPredicted, t, i18n.language],
  );

  const workflowSourceSummary = useMemo(() => {
    if (!orch.connected && orch.lastPollError) {
      return t("orchestration.unreachable");
    }
    if (!orch.connected) {
      return t("orchestration.disconnected");
    }
    if (orch.jobs.length === 0) {
      return t("orchestration.connectedEmpty");
    }
    return t("orchestration.connectedJobs", { count: orch.jobs.length });
  }, [orch.connected, orch.lastPollError, orch.jobs.length, t, i18n.language]);

  const [focusedStage, setFocusedStageState] = useState<WorkflowStageId>("input");
  const [leftTabRequest, setLeftTabRequest] = useState<{
    tab: LeftWorkbenchTab;
    nonce: number;
  } | null>(null);

  const setFocusedStage = useCallback((id: WorkflowStageId) => {
    setFocusedStageState(id);
  }, []);

  const focusStage = useCallback((id: WorkflowStageId) => {
    setFocusedStageState(id);
    const tab = STAGE_TO_LEFT_TAB[id];
    if (tab) setLeftTabRequest({ tab, nonce: Date.now() });
  }, []);

  const clearLeftTabRequest = useCallback(() => setLeftTabRequest(null), []);

  const value = useMemo<WorkflowContextValue>(
    () => ({
      stages: WORKFLOW_STAGES,
      focusedStage,
      setFocusedStage,
      focusStage,
      leftTabRequest,
      clearLeftTabRequest,
      stageStatuses,
      heuristicStageStatuses,
      suggestedStage,
      contextualHint,
      orchestrationConnected: orch.connected,
      orchestrationPollError: orch.lastPollError,
      queueDepth: orch.queueDepth,
      runningJobs: orch.jobs,
      lastPipelineError: orch.lastPipelineError,
      workflowSourceSummary,
    }),
    [
      focusedStage,
      setFocusedStage,
      focusStage,
      leftTabRequest,
      clearLeftTabRequest,
      stageStatuses,
      heuristicStageStatuses,
      suggestedStage,
      contextualHint,
      orch.connected,
      orch.lastPollError,
      orch.queueDepth,
      orch.jobs,
      orch.lastPipelineError,
      workflowSourceSummary,
    ],
  );

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const v = useContext(WorkflowContext);
  if (!v) throw new Error("useWorkflow must be used within WorkflowProvider");
  return v;
}

export function useWorkflowOptional() {
  return useContext(WorkflowContext);
}

/** Selective subscription to orchestration store (queue / poll errors) without full workflow context. */
export function useOrchestrationSnapshot() {
  return useSyncExternalStore(subscribeOrchestration, getOrchestrationSnapshot, getOrchestrationSnapshot);
}
