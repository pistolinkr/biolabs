import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Loader2, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { phaeleonPanel } from "@/components/phaeleon/phaeleonPanelChrome";
import { useLocale } from "@/contexts/LocaleContext";
import { useDrugExplainSnapshot } from "@/hooks/useDrugExplainSnapshot";
import {
  drugExplainCacheKey,
  prefetchDrugExplain,
} from "@/lib/phaeleon/phaeleonDrugExplainCache";
import { notifyPhaeleonAiNotConfigured, notifyPhaeleonAiUnavailable } from "@/lib/phaeleon/phaeleonAiNotices";
import type { DrugProfile, DrugSlot } from "@/lib/phaeleon/types";
import { cn } from "@/lib/utils";

const POPOVER_WIDTH = 288;
const POPOVER_MAX_HEIGHT = 280;
const POPOVER_GAP = 8;

interface PhaeleonDrugExplainPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  slotLabel: string;
  drug: DrugSlot | null;
  profile: DrugProfile | null;
}

export default function PhaeleonDrugExplainPopover({
  open,
  onClose,
  anchorRef,
  slotLabel,
  drug,
  profile,
}: PhaeleonDrugExplainPopoverProps) {
  const { t } = useTranslation("phaeleon");
  const { t: tc } = useTranslation("common");
  const { resolvedLocale } = useLocale();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const notifiedErrorRef = useRef(false);

  const cacheKey =
    drug && open ? drugExplainCacheKey(resolvedLocale, drug.name, profile) : null;
  const snapshot = useDrugExplainSnapshot(cacheKey);

  useEffect(() => {
    if (!open || !drug) return;
    prefetchDrugExplain({
      drugName: drug.name,
      slotLabel,
      profile,
      locale: resolvedLocale,
    });
  }, [open, drug, profile, slotLabel, resolvedLocale]);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const popoverHeight = popoverRef.current?.offsetHeight ?? POPOVER_MAX_HEIGHT;
      const popoverWidth = POPOVER_WIDTH;

      let left = rect.right + POPOVER_GAP;
      let top = rect.top;

      if (left + popoverWidth > window.innerWidth - 8) {
        left = Math.max(8, rect.left - popoverWidth - POPOVER_GAP);
      }

      if (top + popoverHeight > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - popoverHeight - 8);
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, snapshot.status, snapshot.content]);

  useEffect(() => {
    if (!open) {
      notifiedErrorRef.current = false;
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open || snapshot.status !== "error" || notifiedErrorRef.current) return;
    notifiedErrorRef.current = true;
    if (snapshot.errorCode === "AI_NOT_CONFIGURED") {
      notifyPhaeleonAiNotConfigured();
    } else {
      notifyPhaeleonAiUnavailable(new Error(snapshot.error ?? t("inputRail.drugExplainFailed")));
    }
  }, [open, snapshot.status, snapshot.error, snapshot.errorCode, t]);

  if (!open || !drug) return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="phaeleon-drug-explain-title"
      className={cn(
        phaeleonPanel.shell,
        "fixed z-[70] flex flex-col overflow-hidden border border-border shadow-md",
        "animate-in fade-in-0 slide-in-from-left-1 duration-150",
      )}
      style={{
        top: position.top,
        left: position.left,
        width: POPOVER_WIDTH,
        maxHeight: POPOVER_MAX_HEIGHT,
      }}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-2 py-1.5">
        <div className="min-w-0">
          <p className={phaeleonPanel.microLabel}>{slotLabel}</p>
          <p id="phaeleon-drug-explain-title" className="truncate text-xs font-medium text-foreground">
            {drug.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={tc("actions.close")}
          className="flex size-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="workstation-scroll-region min-h-0 flex-1 p-2">
        {snapshot.status === "loading" || snapshot.status === "idle" ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-accent" />
            {t("inputRail.drugExplainLoading")}
          </div>
        ) : snapshot.status === "error" ? (
          <p className="text-[11px] leading-relaxed text-destructive">
            {snapshot.error ?? t("inputRail.drugExplainFailed")}
          </p>
        ) : snapshot.content ? (
          <div className="prose prose-sm max-w-none text-[11px] leading-relaxed text-foreground">
            <Streamdown>{snapshot.content}</Streamdown>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
