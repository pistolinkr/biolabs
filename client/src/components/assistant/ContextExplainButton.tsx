import React from "react";
import { Sparkles } from "lucide-react";
import type { AiExplainIntent } from "@shared/ai/types";
import { useAssistant } from "@/contexts/AssistantContext";
import { cn } from "@/lib/utils";

interface ContextExplainButtonProps {
  intent: AiExplainIntent;
  prompt: string;
  label?: string;
  openChat?: boolean;
  popoverOnly?: boolean;
  globalPopover?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function ContextExplainButton({
  intent,
  prompt,
  label = "Explain",
  openChat = false,
  popoverOnly = false,
  globalPopover = true,
  className,
  disabled,
}: ContextExplainButtonProps) {
  const { explain, isSending, status } = useAssistant();

  return (
    <button
      type="button"
      disabled={disabled || isSending || !status?.configured}
      onClick={() => void explain({ intent, prompt, openChat, popoverOnly, globalPopover })}
      className={cn(
        "inline-flex items-center gap-1 border border-border bg-background px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide text-muted-foreground hover:border-accent hover:text-foreground disabled:opacity-40",
        className,
      )}
    >
      <Sparkles className="size-2.5" />
      {label}
    </button>
  );
}
