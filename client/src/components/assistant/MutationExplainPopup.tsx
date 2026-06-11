import React, { useEffect } from "react";
import ContextExplainButton from "@/components/assistant/ContextExplainButton";
import { useAssistant } from "@/contexts/AssistantContext";

interface MutationExplainPopupProps {
  mutationLabel: string;
  mutationDetail?: string;
  className?: string;
}

export default function MutationExplainPopup({
  mutationLabel,
  mutationDetail,
  className,
}: MutationExplainPopupProps) {
  const { registerContextExtension } = useAssistant();

  useEffect(() => {
    return registerContextExtension({
      mutation: mutationDetail ? `${mutationLabel} — ${mutationDetail}` : mutationLabel,
    });
  }, [mutationLabel, mutationDetail, registerContextExtension]);

  const prompt = `Explain the mutation "${mutationLabel}"${mutationDetail ? ` (${mutationDetail})` : ""} in the context of the loaded protein structure. Discuss likely structural and functional consequences.`;

  return (
    <div
      className={
        className ??
        "flex items-center justify-between gap-2 border border-border bg-background px-2 py-1.5"
      }
    >
      <span className="font-mono text-[9px] text-foreground">{mutationLabel}</span>
      <ContextExplainButton intent="mutation" prompt={prompt} label="Explain mutation" />
    </div>
  );
}
