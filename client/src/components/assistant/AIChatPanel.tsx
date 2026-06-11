import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Loader2, Send, Trash2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { useAssistant } from "@/contexts/AssistantContext";
import { cn } from "@/lib/utils";

export default function AIChatPanel() {
  const { t } = useTranslation("assistant");
  const {
    messages,
    status,
    statusLoading,
    isSending,
    sendMessage,
    clearMessages,
    lastContext,
  } = useAssistant();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendMessage(text);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card text-card-foreground">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-2 py-2">
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          <Bot className="size-3.5 text-accent" />
          {t("assistant.title")}
        </div>
        <button
          type="button"
          onClick={clearMessages}
          title={t("assistant.clearChat")}
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="border-b border-border px-2 py-1.5 font-mono text-[8px] leading-snug text-muted-foreground">
        {statusLoading ? (
          t("assistant.checking")
        ) : status?.configured ? (
          <>
            {t("assistant.provider", {
              provider: status.active_provider ?? "auto",
              model:
                status.active_provider && status.models[status.active_provider]
                  ? t("assistant.providerModel", { model: status.models[status.active_provider] })
                  : "",
            })}
          </>
        ) : (
          <div className="space-y-0.5">
            <div>{t("assistant.notConfiguredEnv")}</div>
            <div className="text-muted-foreground/80">{t("assistant.staticHostingNote")}</div>
          </div>
        )}
      </div>

      {lastContext ? (
        <div className="border-b border-border px-2 py-1 font-mono text-[8px] text-muted-foreground">
          {t("assistant.context", {
            protein: lastContext.protein_name ?? t("assistant.noProtein"),
            residue: lastContext.residue_key ? ` · ${lastContext.residue_key}` : "",
          })}
        </div>
      ) : null}

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {messages.length === 0 ? (
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">{t("assistant.emptyState")}</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-none border px-2 py-1.5 text-[11px] leading-relaxed",
                m.role === "user"
                  ? "ml-4 border-accent/40 bg-secondary text-foreground"
                  : "mr-4 border-border bg-background text-card-foreground",
                m.error && "border-destructive/50 text-destructive",
              )}
            >
              <div className="mb-0.5 font-mono text-[8px] uppercase tracking-wide text-muted-foreground">
                {m.role === "user" ? t("assistant.you") : t("assistant.aiName")}
                {m.pending ? " …" : ""}
              </div>
              {m.pending ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  {t("assistant.thinking")}
                </div>
              ) : m.role === "assistant" ? (
                <Streamdown>{m.content}</Streamdown>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="shrink-0 border-t border-border p-2">
        <div className="flex gap-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder={t("assistant.placeholder")}
            disabled={isSending || !status?.configured}
            className="min-h-[52px] flex-1 resize-none border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground placeholder:text-muted-foreground disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim() || !status?.configured}
            className="flex shrink-0 items-center justify-center border border-border bg-secondary px-2 text-foreground hover:bg-muted disabled:opacity-40"
          >
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
