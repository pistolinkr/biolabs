/** Placeholder types for MD, folding trajectories, docking — no runtime integration yet. */
export type SimulationRunState = "idle" | "queued" | "running" | "completed" | "failed";

/** Future: orchestrator-owned jobs (local/offline-first workers). */
export type MolecularPipelineJobKind =
  | "structure_resolve"
  | "folding"
  | "interaction_analysis"
  | "docking"
  | "md_sampling";

export interface MolecularPipelineJob {
  id: string;
  kind: MolecularPipelineJobKind;
  state: SimulationRunState;
  message?: string;
}

export interface TrajectoryHandle {
  id: string;
  format: "placeholder";
}

export interface DockingJob {
  id: string;
  status: "stub";
}

export interface MutationVariant {
  id: string;
  label: string;
  status: "planned";
}
