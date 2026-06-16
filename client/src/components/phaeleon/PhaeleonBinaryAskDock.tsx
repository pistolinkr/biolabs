import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Send } from "lucide-react";
import { Streamdown } from "streamdown";
import { useAssistant } from "@/contexts/AssistantContext";
import { usePhaeleonAssistantChatConfig } from "@/hooks/usePhaeleonAssistantChatConfig";
import { cn } from "@/lib/utils";

/** Binary ask dock scale (1.07×) — keep `BINARY_DOCK_SCALE` in sync with calc multipliers below. */
const BINARY_DOCK_SCALE = 1.07;

const binaryDockInset = "mx-auto w-full max-w-[calc(332px*1.30)]";
const binaryDockGap = "gap-[calc(0.5rem*1.30)]";
const binaryPillRadius = "rounded-[calc(27px*1.30)]";
const binaryText = "text-[calc(11px*1.30)]";
const binaryPillPad = "px-[calc(10px*1.30)] py-[calc(6px*1.30)]";
const binaryPillMaxW = "max-w-[min(calc(320px*1.30),85%)]";
const binaryInputH = "h-[calc(31px*1.30)]";
const binarySendSize = "size-[calc(32px*1.30)]";
const binaryIconSm = "size-[calc(12px*1.30)]";
const binaryIconMd = "size-[calc(14px*1.30)]";
const binaryInlineGap = "gap-[calc(6px*1.30)]";

void BINARY_DOCK_SCALE;

/** Max share of viewport height for the Binary Q/A thread before it scrolls. */
const BINARY_ASK_THREAD_MAX_HEIGHT_RATIO = 0.36;
const binaryThreadMaxHeight = "max-h-[calc(100vh*0.36)]";

void BINARY_ASK_THREAD_MAX_HEIGHT_RATIO;

const BINARY_PILL_RADIUS_BASE = 27 * 1.3;
const BINARY_PILL_RADIUS_MIN = 10;
const BINARY_PILL_RADIUS_STEP = 7;

function countMessageParagraphs(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 1;
  const blocks = trimmed
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length > 1) return blocks.length;
  const lines = trimmed
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return Math.max(1, lines.length);
}

function binaryPillBorderRadius(paragraphCount: number): number {
  const extra = Math.max(0, paragraphCount - 1);
  return Math.max(BINARY_PILL_RADIUS_MIN, BINARY_PILL_RADIUS_BASE - extra * BINARY_PILL_RADIUS_STEP);
}

function BinaryPill({
  children,
  className,
  paragraphCount = 1,
}: {
  children: React.ReactNode;
  className?: string;
  paragraphCount?: number;
}) {
  return (
    <div
      style={{ borderRadius: binaryPillBorderRadius(paragraphCount) }}
      className={cn(
        "border border-border bg-background leading-snug text-muted-foreground transition-[border-radius] duration-300 ease-out",
        binaryPillPad,
        binaryText,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Inline Binary composer — pill thread + anchored input row (Phaeleon result 2/3). */
export default function PhaeleonBinaryAskDock() {
  const { t } = useTranslation("phaeleon");
  const { pairReady, onAnchorClick } = usePhaeleonAssistantChatConfig();
  const { messages, isSending, aiConfigured, sendMessage } = useAssistant();
  const [draft, setDraft] = useState("");
  const threadScrollRef = useRef<HTMLDivElement>(null);

  const showThread = messages.length > 0 || isSending;

  useEffect(() => {
    const el = threadScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, isSending]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSending || !aiConfigured) return;
    setDraft("");
    await sendMessage(text, "agent");
  };

  return (
    <div id="phaeleon-assistant-dock" className={cn("flex w-full shrink-0 flex-col", binaryDockGap)}>
      {showThread ? (
        <div
          ref={threadScrollRef}
          className={cn(
            "workstation-scroll-region min-h-0 overflow-y-auto overscroll-contain",
            binaryThreadMaxHeight,
            binaryDockInset,
          )}
        >
          <div className={cn("flex flex-col", binaryDockGap)}>
          {messages.map((m) => {
            const paragraphCount =
              m.role === "assistant" && m.pending ? 1 : countMessageParagraphs(m.content);

            return (
            <BinaryPill
              key={m.id}
              paragraphCount={paragraphCount}
              className={cn(
                "w-auto",
                binaryPillMaxW,
                m.role === "user" ? "self-end text-foreground" : "self-start text-foreground",
              )}
            >
              {m.role === "user" ? (
                <span className="phaeleon-blur-reveal">
                  <span className="text-muted-foreground">{t("layout.binaryQuestion")} </span>
                  {m.content}
                </span>
              ) : m.pending ? (
                <span className={cn("inline-flex items-center", binaryInlineGap)}>
                  <Loader2 className={cn(binaryIconSm, "animate-spin text-accent")} />
                  <span className="text-muted-foreground">{t("layout.binaryAnswer")} </span>
                  {t("layout.answering")}
                </span>
              ) : (
                <>
                  <span className="text-muted-foreground">{t("layout.binaryAnswer")} </span>
                  <span
                    className="phaeleon-blur-reveal"
                    onClick={(e) => {
                      const anchor = (e.target as HTMLElement).closest("a");
                      if (!anchor || !onAnchorClick) return;
                      const href = anchor.getAttribute("href");
                      if (href && onAnchorClick(href)) e.preventDefault();
                    }}
                  >
                    <Streamdown>{m.content}</Streamdown>
                  </span>
                </>
              )}
            </BinaryPill>
            );
          })}
          </div>
        </div>
      ) : null}

      <p className={cn("text-center text-muted-foreground", binaryText)}>{t("layout.askAboutResult")}</p>

      <form onSubmit={(e) => void onSubmit(e)} className={cn("flex items-center", binaryDockGap, binaryDockInset)}>
        <label className="sr-only" htmlFor="phaeleon-binary-ask">
          {t("assistant.askBinaryPlaceholder")}
        </label>
        <input
          id="phaeleon-binary-ask"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!aiConfigured || isSending}
          placeholder={pairReady ? t("assistant.askBinaryPlaceholder") : t("assistant.emptyNoPair")}
          className={cn(
            binaryInputH,
            "min-w-0 flex-1 border border-border bg-background",
            binaryPillRadius,
            binaryPillPad,
            binaryText,
            "text-foreground outline-none transition-colors placeholder:text-muted-foreground",
            "focus:border-accent disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        <button
          type="submit"
          disabled={!aiConfigured || isSending || !draft.trim()}
          aria-busy={isSending}
          className={cn(
            "flex shrink-0 items-center justify-center border border-border bg-background",
            binarySendSize,
            binaryPillRadius,
            "text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40",
          )}
          aria-label={t("assistant.askBinaryPlaceholder")}
        >
          {isSending ? (
            <Loader2 className={cn(binaryIconMd, "animate-spin")} />
          ) : (
            <Send className={binaryIconMd} />
          )}
        </button>
      </form>
    </div>
  );
}
