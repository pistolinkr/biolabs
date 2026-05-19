/**
 * Wire types for GET /api/workflow/status — minimal job visibility until full JobStore ships.
 */
export type WorkflowJobWireStatus = "queued" | "running" | "completed" | "failed";

export type WorkflowStageWireId =
  | "input"
  | "ai_pipeline"
  | "folding"
  | "analysis"
  | "reasoning"
  | "visualization"
  | "simulation"
  | "engineering";

export interface WorkflowJobWire {
  id: string;
  stageId: WorkflowStageWireId;
  status: WorkflowJobWireStatus;
  message?: string;
  /** Optional monotonic client hint for ordering */
  updatedAt?: number;
}

export interface WorkflowStatusPayload {
  connected: true;
  jobs: WorkflowJobWire[];
  queueDepth: number;
  lastPipelineError: string | null;
}

export interface WorkflowStatusDisconnected {
  connected: false;
  jobs: [];
  queueDepth: 0;
  lastPipelineError: string | null;
}
