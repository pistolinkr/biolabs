/** Ordered narrative: contextual AI molecular workflow (visualization is one stage, not the hub). */
export type WorkflowStageId =
  | "input"
  | "ai_pipeline"
  | "folding"
  | "analysis"
  | "reasoning"
  | "visualization"
  | "simulation"
  | "engineering";

/** Heuristic + orchestration overlay (`running` / `failed` from job queue when connected). */
export type WorkflowStageStatus =
  | "locked"
  | "pending"
  | "ready"
  | "complete"
  | "running"
  | "failed";

export type LeftWorkbenchTab = "input" | "structure" | "display" | "source";

export const WORKFLOW_STAGES: {
  id: WorkflowStageId;
  label: string;
  short: string;
}[] = [
  { id: "input", label: "Input", short: "In" },
  { id: "ai_pipeline", label: "AI pipeline", short: "AI" },
  { id: "folding", label: "Folding", short: "Fold" },
  { id: "analysis", label: "Analysis", short: "Anly" },
  { id: "reasoning", label: "Reasoning", short: "Rsn" },
  { id: "visualization", label: "Visualize", short: "Viz" },
  { id: "simulation", label: "Simulation", short: "Sim" },
  { id: "engineering", label: "Engineering", short: "Eng" },
];
