import React from "react";
import { Loader2, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { useAssistant } from "@/contexts/AssistantContext";

export default function ExplainPopover() {
  const { explainPopover, closeExplainPopover, setChatOpen } = useAssistant();

  if (!explainPopover?.open) return null;

  const { title, content, loading } = explainPopover;

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[min(420px,calc(100vw-2rem))] border border-border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-foreground">{title}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="font-mono text-[8px] uppercase text-muted-foreground hover:text-foreground"
          >
            Open chat
          </button>
          <button type="button" onClick={closeExplainPopover} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto p-3 text-[11px] leading-relaxed text-card-foreground">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Analyzing with platform context…
          </div>
        ) : content ? (
          <Streamdown>{content}</Streamdown>
        ) : null}
      </div>
    </div>
  );
}
