import React, { useMemo } from "react";
import { useLiveRevealText } from "@/hooks/useLiveRevealText";
import { cn } from "@/lib/utils";

const REVEAL_BLUR_MAX_PX = 8;

export default function LiveTranslatedText({
  text,
  sourceText,
  isTranslating,
  reveal,
  className,
}: {
  text: string;
  sourceText?: string;
  isTranslating?: boolean;
  reveal?: boolean;
  className?: string;
}) {
  const revealActive = Boolean(reveal && !isTranslating && text.length > 0);
  const revealed = useLiveRevealText(text, revealActive);
  const progress = text.length > 0 ? revealed.length / text.length : 1;
  const revealing = revealActive && revealed.length < text.length;

  const revealStyle = useMemo(() => {
    if (!revealing) return undefined;
    const blurPx = Math.max(0, REVEAL_BLUR_MAX_PX * (1 - progress));
    return {
      filter: blurPx > 0.05 ? `blur(${blurPx}px)` : undefined,
      opacity: 0.35 + 0.65 * progress,
      transition: "filter 0.14s ease-out, opacity 0.14s ease-out",
    } satisfies React.CSSProperties;
  }, [progress, revealing]);

  const showSource =
    Boolean(sourceText && sourceText !== text) &&
    (isTranslating || (reveal && !isTranslating && revealed.length < text.length));

  return (
    <span className={cn("phaeleon-live-translate relative inline", className)}>
      {showSource ? (
        <span className="phaeleon-live-translate-source" aria-hidden="true">
          {sourceText}
        </span>
      ) : null}
      <span
        style={revealStyle}
        className={cn(
          "phaeleon-live-translate-target",
          isTranslating && "phaeleon-live-translate-target--pending",
          revealing && "phaeleon-live-translate-target--revealing",
        )}
      >
        {revealed}
      </span>
    </span>
  );
}
