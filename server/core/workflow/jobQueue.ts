import type { WorkflowJobWire } from "./types.ts";

/**
 * In-memory job snapshots for /api/workflow/status. Replace with durable JobStore when orchestrator lands.
 */
const jobs: WorkflowJobWire[] = [];
let lastPipelineError: string | null = null;

export function getWorkflowJobsSnapshot(): {
  jobs: WorkflowJobWire[];
  queueDepth: number;
  lastPipelineError: string | null;
} {
  const active = jobs.filter((j) => j.status === "queued" || j.status === "running");
  return {
    jobs: jobs.map((j) => ({ ...j })),
    queueDepth: active.length,
    lastPipelineError,
  };
}

/** Test / future: register a job from pipeline runner */
export function __workflowRegisterJob_stub(job: WorkflowJobWire): void {
  jobs.push({ ...job, updatedAt: Date.now() });
}

export function __workflowClearForTests(): void {
  jobs.length = 0;
  lastPipelineError = null;
}

export function __workflowSetLastError(message: string | null): void {
  lastPipelineError = message;
}
