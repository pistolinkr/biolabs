import type { WorkflowStageId, WorkflowStageStatus } from "@/core/workflow/stageTypes";
import type { WorkflowJobClient } from "@/core/workflow/orchestrationStore";

/**
 * Overlay server-reported jobs on heuristic ViewerContext-derived statuses.
 */
export function mergeStageStatusesWithJobs(
  base: Record<WorkflowStageId, WorkflowStageStatus>,
  jobs: WorkflowJobClient[],
): Record<WorkflowStageId, WorkflowStageStatus> {
  const out: Record<WorkflowStageId, WorkflowStageStatus> = { ...base };
  for (const j of jobs) {
    const sid = j.stageId as WorkflowStageId;
    if (j.status === "failed") {
      out[sid] = "failed";
      continue;
    }
    if (j.status === "running" || j.status === "queued") {
      const cur = out[sid];
      if (cur !== "locked") out[sid] = "running";
    }
  }
  return out;
}
