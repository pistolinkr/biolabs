import React from "react";
import { Sparkles } from "lucide-react";
import { useAssistant } from "@/contexts/AssistantContext";
import { cn } from "@/lib/utils";

interface AskAIButtonProps {
  className?: string;
  variant?: "header" | "compact";
}

export default function AskAIButton({ className, variant = "header" }: AskAIButtonProps) {
  const { setChatOpen, status } = useAssistant();

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        title="Ask AI"
        className={cn(
          "inline-flex items-center gap-1 border border-border bg-secondary px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <Sparkles className="size-3" />
        Ask AI
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setChatOpen(true)}
      title={status?.configured ? "Open AI assistant" : "AI not configured"}
      className={cn(
        "hidden items-center gap-2 border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex",
        !status?.configured && "opacity-60",
        className,
      )}
    >
      <Sparkles size={14} />
      <span>Ask AI</span>
    </button>
  );
}
