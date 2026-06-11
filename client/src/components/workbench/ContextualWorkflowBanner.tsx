import React from "react";
import { useTranslation } from "react-i18next";
import { useWorkflow } from "@/contexts/WorkflowContext";

/** Rule-based “next step” copy — substitutes until local LLM/tools are attached. */
export default function ContextualWorkflowBanner() {
  const { t } = useTranslation("workflow");
  const { contextualHint, suggestedStage, stages, focusStage } = useWorkflow();
  const sug = stages.find((s) => s.id === suggestedStage);

  return (
    <div className="flex shrink-0 items-start gap-2 border-b border-[#2A2A2A] bg-[#101010] px-3 py-1.5">
      <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.2em] text-[#5A6A7A]">
        {t("banner.ctxLabel")}
      </span>
      <p className="min-w-0 flex-1 font-mono text-[10px] leading-snug text-[#B0B0B0]">
        {contextualHint}
      </p>
      {sug ? (
        <button
          type="button"
          onClick={() => focusStage(suggestedStage)}
          className="shrink-0 border border-[#2A2A2A] bg-[#141414] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wide text-[#8A9AAA] hover:border-[#4A5A6A] hover:text-[#F2F2F2]"
        >
          Go {t(`stages.${sug.id}.short`)}
        </button>
      ) : null}
    </div>
  );
}
