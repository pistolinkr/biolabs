import type { WorkflowStageId } from "@/core/workflow/stageTypes";

/** Client-side job row from GET /api/workflow/status */
export type WorkflowJobClientStatus = "queued" | "running" | "completed" | "failed";

export interface WorkflowJobClient {
  id: string;
  stageId: WorkflowStageId;
  status: WorkflowJobClientStatus;
  message?: string;
  updatedAt?: number;
}

export interface WorkflowStatusClient {
  connected: boolean;
  jobs: WorkflowJobClient[];
  queueDepth: number;
  lastPipelineError: string | null;
}

export interface OrchestrationSnapshot {
  connected: boolean;
  /** Last fetch error (network / non-OK), distinct from pipeline errors */
  lastPollError: string | null;
  jobs: WorkflowJobClient[];
  queueDepth: number;
  lastPipelineError: string | null;
  pollGeneration: number;
}

const initial: OrchestrationSnapshot = {
  connected: false,
  lastPollError: null,
  jobs: [],
  queueDepth: 0,
  lastPipelineError: null,
  pollGeneration: 0,
};

let snapshot: OrchestrationSnapshot = { ...initial };

const listeners = new Set<() => void>();

export function subscribeOrchestration(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOrchestrationSnapshot(): OrchestrationSnapshot {
  return snapshot;
}

export function applyOrchestrationPatch(patch: Partial<Omit<OrchestrationSnapshot, "pollGeneration">>): void {
  snapshot = {
    ...snapshot,
    ...patch,
    pollGeneration: snapshot.pollGeneration + 1,
  };
  listeners.forEach((l) => l());
}

export function resetOrchestrationForTests(): void {
  snapshot = { ...initial };
  listeners.forEach((l) => l());
}
