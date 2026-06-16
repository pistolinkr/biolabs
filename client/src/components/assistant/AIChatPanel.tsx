import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Check, Loader2, Send, Trash2, X } from "lucide-react";
import { Streamdown } from "streamdown";
import type { AiExplainIntent } from "@shared/ai/types";
import { PhaeleonPanelHeader } from "@/components/phaeleon/phaeleonPanelChrome";
import { useAssistant } from "@/contexts/AssistantContext";
import { cn } from "@/lib/utils";

interface AIChatPanelProps {
  variant?: "standalone" | "embedded";
  placeholder?: string;
  emptyState?: string;
  className?: string;
  /** Match workbench panel rhythm (px-3 / p-3) instead of compact dock padding. */
  panelPadding?: "default" | "workbench";
  /** Two-line panel header (kicker + title) — matches Phaeleon panel chrome height. */
  headerKicker?: string;
  headerTitle?: string;
  /** Default chat intent — Phaeleon uses "agent" for page control; Helix dock may use "agent". */
  chatIntent?: AiExplainIntent;
  assistantName?: string;
  /** Shown above the composer — e.g. active drug pair context badge. */
  inputContextBadge?: React.ReactNode;
  /** Optional quick prompt chips above the message list. */
  quickPrompts?: { id: string; label: string; prompt: string }[];
  /** Intercept in-message anchor clicks (return true if handled). */
  onAnchorClick?: (href: string) => boolean;
  /** Rendered above chat messages inside the scroll region (e.g. fused report). */
  scrollPrefix?: React.ReactNode;
  /** Hide built-in panel header — caller provides outer chrome. */
  suppressHeader?: boolean;
  /** Pin composer to viewport bottom; scroll region excludes form. */
  composerPinned?: boolean;
  /** Suppress default empty message list text when scrollPrefix fills the canvas. */
  hideEmptyMessages?: boolean;
}

export default function AIChatPanel({
  variant = "standalone",
  placeholder,
  emptyState,
  className,
  panelPadding = "default",
  headerKicker,
  headerTitle,
  chatIntent = "agent",
  assistantName,
  inputContextBadge,
  quickPrompts,
  onAnchorClick,
  scrollPrefix,
  suppressHeader,
  composerPinned = false,
  hideEmptyMessages = false,
}: AIChatPanelProps) {
  const { t } = useTranslation("assistant");
  const embedded = variant === "embedded";
  const workbenchPad = panelPadding === "workbench";
  const panelHeader = !suppressHeader && workbenchPad && headerKicker && headerTitle;
  const headerPad = workbenchPad ? "px-3 py-2" : "px-2 py-2";
  const bodyPad = workbenchPad ? "p-3" : embedded ? "p-2.5" : "p-2";
  const formPad = workbenchPad ? "p-3" : embedded ? "p-2.5" : "p-2";
  const {
    messages,
    status,
    statusLoading,
    isSending,
    aiConfigured,
    sendMessage,
    clearMessages,
  } = useAssistant();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const inputDisabled = isSending;
  const sendDisabled = isSending || !aiConfigured;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendMessage(text, chatIntent);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const clearChatButton = (
    <button
      type="button"
      onClick={clearMessages}
      title={t("assistant.clearChat")}
      className="flex size-5 items-center justify-center text-muted-foreground hover:text-foreground"
    >
      <Trash2 className="size-3.5" />
    </button>
  );

  const useGridLayout = workbenchPad && (composerPinned || !suppressHeader);

  return (
    <div
      className={cn(
        "assistant-panel h-full min-h-0 overflow-hidden bg-card text-card-foreground",
        useGridLayout
          ? composerPinned
            ? "grid grid-rows-[minmax(0,1fr)_auto]"
            : "grid grid-rows-[auto_minmax(0,1fr)_auto]"
          : "flex flex-col",
        className,
      )}
    >
      {!embedded && !suppressHeader && panelHeader ? (
        <PhaeleonPanelHeader kicker={headerKicker} title={headerTitle} trailing={clearChatButton} />
      ) : !embedded && !suppressHeader ? (
        <div className={cn("flex shrink-0 items-center justify-between border-b border-border", headerPad)}>
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            <Bot className="size-3.5 text-accent" />
            {t("assistant.title")}
          </div>
          {clearChatButton}
        </div>
      ) : null}

      {composerPinned ? (
        <div className="flex min-h-0 flex-col overflow-hidden">
          {!statusLoading && !aiConfigured ? (
            <div className={cn("shrink-0 border-b border-border font-mono text-[8px] leading-snug text-muted-foreground", headerPad)}>
              {t("assistant.notConfiguredEnv")}
            </div>
          ) : null}
          <div ref={scrollRef} className={cn("workstation-scroll-region min-h-0 flex-1 space-y-2", bodyPad)}>
            {scrollPrefix}
            {quickPrompts && quickPrompts.length > 0 ? (
              <div className="mb-2 space-y-1">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
                  {t("assistant.quickPrompts", { defaultValue: "Quick prompts" })}
                </p>
                <div className="flex flex-wrap gap-1">
                  {quickPrompts.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={sendDisabled}
                      onClick={() => void sendMessage(item.prompt, chatIntent)}
                      className="border border-border bg-background px-2 py-1 font-mono text-[9px] text-muted-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.length === 0 && !scrollPrefix && !hideEmptyMessages ? (
              <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                {emptyState ?? t("assistant.emptyState")}
              </p>
            ) : messages.length === 0 && (scrollPrefix || hideEmptyMessages) ? null : (
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
                    {m.role === "user" ? t("assistant.you") : (assistantName ?? t("assistant.aiName"))}
                    {m.pending ? " …" : ""}
                  </div>
                  {m.pending ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      {t("assistant.thinking")}
                    </div>
                  ) : m.role === "assistant" ? (
                    <div
                      onClick={(e) => {
                        const anchor = (e.target as HTMLElement).closest("a");
                        if (!anchor || !onAnchorClick) return;
                        const href = anchor.getAttribute("href");
                        if (href && onAnchorClick(href)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <Streamdown>{m.content}</Streamdown>
                      {m.agentSteps && m.agentSteps.length > 0 ? (
                        <ul className="mt-2 space-y-1 border-t border-border pt-2">
                          {m.agentSteps.map((step) => (
                            <li
                              key={step.index}
                              className="flex items-start gap-1.5 font-mono text-[9px] text-muted-foreground"
                            >
                              {step.status === "running" ? (
                                <Loader2 className="mt-0.5 size-3 shrink-0 animate-spin text-accent" />
                              ) : step.status === "success" ? (
                                <Check className="mt-0.5 size-3 shrink-0 text-accent" />
                              ) : step.status === "error" ? (
                                <X className="mt-0.5 size-3 shrink-0 text-destructive" />
                              ) : (
                                <span className="mt-0.5 size-3 shrink-0" />
                              )}
                              <span>
                                {step.label}
                                {step.detail ? (
                                  <span className="ml-1 text-[8px] opacity-70">({step.detail})</span>
                                ) : null}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {m.agentExecuting && !m.agentSteps?.length ? (
                        <p className="mt-2 font-mono text-[9px] text-muted-foreground">{t("agent.executing")}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <>
          {!statusLoading && !aiConfigured ? (
            <div className={cn("border-b border-border font-mono text-[8px] leading-snug text-muted-foreground", headerPad)}>
              {t("assistant.notConfiguredEnv")}
            </div>
          ) : null}

          <div ref={scrollRef} className={cn("workstation-scroll-region min-h-0 flex-1 space-y-2", bodyPad)}>
        {scrollPrefix}
        {quickPrompts && quickPrompts.length > 0 ? (
          <div className="mb-2 space-y-1">
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
              {t("assistant.quickPrompts", { defaultValue: "Quick prompts" })}
            </p>
            <div className="flex flex-wrap gap-1">
              {quickPrompts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={sendDisabled}
                  onClick={() => void sendMessage(item.prompt, chatIntent)}
                  className="border border-border bg-background px-2 py-1 font-mono text-[9px] text-muted-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.length === 0 && !scrollPrefix && !hideEmptyMessages ? (
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            {emptyState ?? t("assistant.emptyState")}
          </p>
        ) : messages.length === 0 && (scrollPrefix || hideEmptyMessages) ? null : (
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
                {m.role === "user" ? t("assistant.you") : (assistantName ?? t("assistant.aiName"))}
                {m.pending ? " …" : ""}
              </div>
              {m.pending ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  {t("assistant.thinking")}
                </div>
              ) : m.role === "assistant" ? (
                <div
                  onClick={(e) => {
                    const anchor = (e.target as HTMLElement).closest("a");
                    if (!anchor || !onAnchorClick) return;
                    const href = anchor.getAttribute("href");
                    if (href && onAnchorClick(href)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Streamdown>{m.content}</Streamdown>
                  {m.agentSteps && m.agentSteps.length > 0 ? (
                    <ul className="mt-2 space-y-1 border-t border-border pt-2">
                      {m.agentSteps.map((step) => (
                        <li
                          key={step.index}
                          className="flex items-start gap-1.5 font-mono text-[9px] text-muted-foreground"
                        >
                          {step.status === "running" ? (
                            <Loader2 className="mt-0.5 size-3 shrink-0 animate-spin text-accent" />
                          ) : step.status === "success" ? (
                            <Check className="mt-0.5 size-3 shrink-0 text-accent" />
                          ) : step.status === "error" ? (
                            <X className="mt-0.5 size-3 shrink-0 text-destructive" />
                          ) : (
                            <span className="mt-0.5 size-3 shrink-0" />
                          )}
                          <span>
                            {step.label}
                            {step.detail ? (
                              <span className="ml-1 text-[8px] opacity-70">({step.detail})</span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {m.agentExecuting && !m.agentSteps?.length ? (
                    <p className="mt-2 font-mono text-[9px] text-muted-foreground">{t("agent.executing")}</p>
                  ) : null}
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          ))
        )}
      </div>
        </>
      )}

      <form onSubmit={onSubmit} className={cn("relative z-10 shrink-0 bg-background", formPad)}>
        {inputContextBadge ? <div className="mb-2">{inputContextBadge}</div> : null}
        <div className={cn("flex gap-1", workbenchPad && "items-center gap-2")}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={workbenchPad ? 1 : embedded ? 3 : 2}
            placeholder={placeholder ?? t("assistant.placeholder")}
            disabled={inputDisabled}
            className={cn(
              "flex-1 resize-none border border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
              workbenchPad
                ? "min-h-[52px] max-h-32 px-3 py-[15px] text-sm leading-normal"
                : "min-h-[52px] px-2 py-1.5 font-mono text-[11px]",
              embedded && !workbenchPad && "min-h-[64px]",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={sendDisabled || !draft.trim()}
            className={cn(
              "flex shrink-0 items-center justify-center border border-border bg-secondary text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40",
              workbenchPad ? "size-11 px-2" : "px-2",
            )}
          >
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
