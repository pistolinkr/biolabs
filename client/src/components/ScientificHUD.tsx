import React, { useState, useEffect, useRef, type RefObject, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { GripVertical } from "lucide-react";
import { useViewer } from "@/contexts/ViewerContext";

interface HUDMetrics {
  fps: number;
  atomCount: number;
  chainCount: number;
}

interface ScientificHUDProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  metrics?: Partial<HUDMetrics>;
  /** Bounds — drag keeps HUD fully inside; hard clamp, no animation. */
  canvasRef?: RefObject<HTMLElement | null>;
  /**
   * When true, HUD is `absolute` in the panel (needs a `relative` ancestor).
   * When false, HUD is `fixed` to the viewport.
   */
  dockInsidePanel?: boolean;
}

/**
 * Biolabs Scientific HUD — lightweight render stats (display context is on the viewport chrome).
 */
const HUD_CLAIM_PADDING = 8;

function clampOffsetIntoBounds(
  bounds: DOMRectReadOnly,
  hudRect: DOMRectReadOnly,
  offset: { x: number; y: number },
): { x: number; y: number } {
  const minLeft = bounds.left + HUD_CLAIM_PADDING;
  const minTop = bounds.top + HUD_CLAIM_PADDING;
  const maxLeft = bounds.right - HUD_CLAIM_PADDING - hudRect.width;
  const maxTop = bounds.bottom - HUD_CLAIM_PADDING - hudRect.height;

  const loLeft = Math.min(minLeft, maxLeft);
  const hiLeft = Math.max(minLeft, maxLeft);
  const loTop = Math.min(minTop, maxTop);
  const hiTop = Math.max(minTop, maxTop);

  const targetLeft = Math.min(Math.max(hudRect.left, loLeft), hiLeft);
  const targetTop = Math.min(Math.max(hudRect.top, loTop), hiTop);
  const ddx = targetLeft - hudRect.left;
  const ddy = targetTop - hudRect.top;

  return { x: offset.x + ddx, y: offset.y + ddy };
}

export default function ScientificHUD({
  visible = true,
  position = "top-right",
  metrics: customMetrics,
  canvasRef,
  dockInsidePanel = false,
}: ScientificHUDProps) {
  const { t } = useTranslation("viewport");
  const { structureModel } = useViewer();
  const [fps, setFps] = useState(60);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragActive = useRef(false);
  const dragStart = useRef({ px: 0, py: 0, ox: 0, oy: 0 });
  const hudWrapRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef(dragOffset);

  dragOffsetRef.current = dragOffset;

  /** After offset paints, snap HUD so it stays inside panel (no spring). */
  useLayoutEffect(() => {
    if (!canvasRef?.current || !hudWrapRef.current) return;
    const boundsEl = canvasRef.current;
    const hudEl = hudWrapRef.current;
    const bounds = boundsEl.getBoundingClientRect();
    const hudRect = hudEl.getBoundingClientRect();
    const clamped = clampOffsetIntoBounds(bounds, hudRect, dragOffsetRef.current);
    if (Math.abs(clamped.x - dragOffsetRef.current.x) > 0.01 || Math.abs(clamped.y - dragOffsetRef.current.y) > 0.01) {
      dragOffsetRef.current = clamped;
      setDragOffset(clamped);
    }
  }, [dragOffset, canvasRef, dockInsidePanel]);

  useEffect(() => {
    const boundsEl = canvasRef?.current;
    if (!boundsEl) return;
    const ro = new ResizeObserver(() => {
      if (!hudWrapRef.current) return;
      const bounds = boundsEl.getBoundingClientRect();
      const hudRect = hudWrapRef.current.getBoundingClientRect();
      const clamped = clampOffsetIntoBounds(bounds, hudRect, dragOffsetRef.current);
      if (Math.abs(clamped.x - dragOffsetRef.current.x) > 0.01 || Math.abs(clamped.y - dragOffsetRef.current.y) > 0.01) {
        dragOffsetRef.current = clamped;
        setDragOffset(clamped);
      }
    });
    ro.observe(boundsEl);
    return () => ro.disconnect();
  }, [canvasRef]);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = Date.now();
    const rafRef = { id: 0 as number };

    const loop = () => {
      frameCount += 1;
      rafRef.id = requestAnimationFrame(loop);
    };
    rafRef.id = requestAnimationFrame(loop);

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      if (elapsed >= 1) {
        setFps(Math.min(240, Math.round(frameCount / elapsed)));
        frameCount = 0;
        lastTime = now;
      }
    }, 250);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(rafRef.id);
    };
  }, []);

  const defaultMetrics: HUDMetrics = {
    fps,
    atomCount: structureModel?.atomCount ?? 0,
    chainCount: structureModel?.chains.length ?? 0,
  };

  const displayMetrics = { ...defaultMetrics, ...customMetrics };

  const handleHudPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragActive.current = true;
    dragStart.current = {
      px: e.clientX,
      py: e.clientY,
      ox: dragOffsetRef.current.x,
      oy: dragOffsetRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleHudPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragActive.current) return;
    const d = dragStart.current;
    const next = {
      x: d.ox + (e.clientX - d.px),
      y: d.oy + (e.clientY - d.py),
    };
    dragOffsetRef.current = next;
    setDragOffset(next);
  };

  const handleHudPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragActive.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  if (!visible) return null;

  const positionClasses = {
    "top-left": dockInsidePanel ? "top-2 left-2" : "top-3 left-3",
    "top-right": dockInsidePanel ? "top-2 right-2" : "top-3 right-3",
    "bottom-left": dockInsidePanel ? "bottom-2 left-2" : "bottom-3 left-3",
    "bottom-right": dockInsidePanel ? "bottom-2 right-2" : "bottom-3 right-3",
  };

  const posMode = dockInsidePanel ? 'absolute' : 'fixed';

  return (
    <div
      ref={hudWrapRef}
      className={`${posMode} ${positionClasses[position]} z-40 pointer-events-none`}
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
    >
      <div className="space-y-1 pointer-events-none border border-[#2A2A2A] bg-[#171717]/95 p-2 font-mono text-[10px] text-[#8A8A8A]">
        {/* Header — drag by top-right grip */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="select-none font-medium uppercase tracking-[0.12em] text-[#F2F2F2]">{t("hud.title")}</div>
          <button
            type="button"
            className="pointer-events-auto -m-1 -mr-0.5 shrink-0 cursor-grab touch-none select-none p-1 text-[#8A8A8A] outline-none hover:text-[#F2F2F2] active:cursor-grabbing focus-visible:ring-1 focus-visible:ring-[#3A3A3A]"
            aria-label={t("hud.drag")}
            title={t("hud.drag")}
            onPointerDown={handleHudPointerDown}
            onPointerMove={handleHudPointerMove}
            onPointerUp={handleHudPointerUp}
            onPointerCancel={handleHudPointerUp}
          >
            <GripVertical className="size-3.5 opacity-80" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-0.5">
          <div className="flex justify-between gap-6">
            <span className="uppercase tracking-wide">{t("hud.fps")}</span>
            <span className="text-[#F2F2F2]">{displayMetrics.fps}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="uppercase tracking-wide">{t("hud.atoms")}</span>
            <span className="text-[#F2F2F2]">{displayMetrics.atomCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="uppercase tracking-wide">{t("hud.chains")}</span>
            <span className="text-[#F2F2F2]">{displayMetrics.chainCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
