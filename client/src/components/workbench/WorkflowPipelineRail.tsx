import React from "react";
import { useTranslation } from "react-i18next";
import { useWorkflow, type WorkflowStageId, type WorkflowStageStatus } from "@/contexts/WorkflowContext";
import { cn } from "@/lib/utils";

function statusStyle(role: "dot" | "rail", s: WorkflowStageStatus) {
  if (role === "dot") {
    switch (s) {
      case "complete":
        return "bg-[#8A9A8A] border-[#6A7A6A]";
      case "ready":
        return "bg-[#2A3A4A] border-[#5A6A7A]";
      case "pending":
        return "bg-[#3A3530] border-[#6A5A40]";
      case "running":
        return "bg-[#4A4030] border-[#8A7040] animate-pulse";
      case "failed":
        return "bg-[#4A2020] border-[#8A4040]";
      case "locked":
      default:
        return "bg-[#1A1A1A] border-[#2A2A2A]";
    }
  }
  switch (s) {
    case "complete":
      return "bg-[#3A4A3A]";
    case "ready":
      return "bg-[#2A3540]";
    case "pending":
      return "bg-[#353025]";
    case "running":
      return "bg-[#403528]";
    case "failed":
      return "bg-[#3A2020]";
    case "locked":
    default:
      return "bg-[#222]";
  }
}

function stageIsLit(s: WorkflowStageStatus): boolean {
  return s === "complete" || s === "running";
}

/**
 * Primary workflow chrome — stages are AI/workflow-first; viewport is one step (Visualize).
 */
export default function WorkflowPipelineRail() {
  const { t } = useTranslation("workflow");
  const {
    stages,
    focusedStage,
    focusStage,
    stageStatuses,
    suggestedStage,
    queueDepth,
    orchestrationConnected,
    orchestrationPollError,
    lastPipelineError,
  } = useWorkflow();

  const showQueueBadge = orchestrationConnected && queueDepth > 0;
  const showErrStrip = Boolean(orchestrationPollError || lastPipelineError);

  return (
    <div className="shrink-0 border-b border-[#2A2A2A] bg-[#0D0D0D]">
      {showErrStrip ? (
        <div className="border-b border-[#5A3030] bg-[#1A1010] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wide text-[#C08080]">
          {orchestrationPollError
            ? `Orchestration: ${orchestrationPollError}`
            : `Pipeline: ${lastPipelineError}`}
        </div>
      ) : null}
      <div className="flex items-center gap-1 border-b border-[#1A1A1A] px-1 py-0.5 font-mono text-[8px] text-[#6A6A6A]">
        <span className="uppercase tracking-[0.14em]">Live</span>
        <span className={orchestrationConnected ? "text-[#6A8A7A]" : "text-[#7A5040]"}>
          {orchestrationConnected ? "queue ok" : "queue offline"}
        </span>
        {showQueueBadge ? (
          <span className="rounded-sm border border-[#4A5A4A] bg-[#141816] px-1 py-px text-[#9AB0A0]">
            Q:{queueDepth}
          </span>
        ) : null}
      </div>
      <div className="flex items-stretch gap-0 overflow-x-auto px-1 py-1 font-mono">
        {stages.map((st, i) => {
          const status = stageStatuses[st.id];
          const isFocus = focusedStage === st.id;
          const isSuggested = suggestedStage === st.id && status !== "complete";
          return (
            <React.Fragment key={st.id}>
              <button
                type="button"
                title={`${t(`stages.${st.id}.label`)} — ${status}`}
                onClick={() => focusStage(st.id)}
                className={cn(
                  "flex min-w-[4.5rem] flex-col items-center gap-0.5 px-1.5 py-1 text-left transition-colors",
                  isFocus ? "bg-[#141820]" : "hover:bg-[#121212]",
                )}
              >
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-sm border",
                      statusStyle("dot", status),
                      isSuggested && "ring-1 ring-[#6A7A8A] ring-offset-1 ring-offset-[#0D0D0D]",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[8px] uppercase tracking-[0.12em]",
                      isFocus ? "text-[#F2F2F2]" : "text-[#7A7A7A]",
                    )}
                  >
                    {t(`stages.${st.id}.short`)}
                  </span>
                </div>
                <span
                  className={cn(
                    "max-w-[5.5rem] truncate text-[8px] leading-none",
                    status === "locked" ? "text-[#4A4A4A]" : "text-[#9A9A9A]",
                  )}
                >
                  {t(`stages.${st.id}.label`)}
                </span>
              </button>
              {i < stages.length - 1 ? (
                <div className="flex w-3 shrink-0 items-center justify-center self-center">
                  <div
                    className={cn(
                      "h-px w-full",
                      segmentRailClass(st.id, stages[i + 1]!.id, stageStatuses),
                    )}
                  />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function segmentRailClass(
  a: WorkflowStageId,
  b: WorkflowStageId,
  m: Record<WorkflowStageId, WorkflowStageStatus>,
): string {
  const sa = m[a];
  const sb = m[b];
  const ok =
    stageIsLit(sa) && (stageIsLit(sb) || sb === "ready" || sb === "pending" || sb === "running");
  return ok ? "bg-[#3A4540]" : "bg-[#282828]";
}
