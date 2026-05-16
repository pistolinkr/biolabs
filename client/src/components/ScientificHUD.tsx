import React, { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import { GripVertical } from 'lucide-react';

interface HUDMetrics {
  fps: number;
  atomCount: number;
  chainCount: number;
  simulationTime: number;
  temperature: number;
  energy: number;
  selectedResidue: string;
}

interface ScientificHUDProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  metrics?: Partial<HUDMetrics>;
  /** Viewport / canvas element — HUD is spring-clamped inside this rect on drag release. */
  canvasRef?: RefObject<HTMLElement | null>;
}

/**
 * Biolabs Scientific HUD
 * 
 * Minimal terminal-like overlay for real-time metrics
 * - FPS counter
 * - Atom/chain count
 * - Simulation state
 * - Temperature and energy
 * - Selected residue info
 */
const HUD_CLAIM_PADDING = 8;

function computeOffsetToContainHudInBounds(
  bounds: DOMRectReadOnly,
  hudRect: DOMRectReadOnly,
  currentOffset: { x: number; y: number },
): { x: number; y: number } | null {
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

  if (Math.abs(ddx) < 0.25 && Math.abs(ddy) < 0.25) return null;

  return { x: currentOffset.x + ddx, y: currentOffset.y + ddy };
}

export default function ScientificHUD({
  visible = true,
  position = 'top-right',
  metrics: customMetrics,
  canvasRef,
}: ScientificHUDProps) {
  const [fps, setFps] = useState(60);
  const [frameCount, setFrameCount] = useState(0);
  const [lastTime, setLastTime] = useState(Date.now());
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragActive = useRef(false);
  const dragStart = useRef({ px: 0, py: 0, ox: 0, oy: 0 });
  const hudWrapRef = useRef<HTMLDivElement>(null);
  const springRaf = useRef<number>(0);
  const dragOffsetRef = useRef(dragOffset);

  dragOffsetRef.current = dragOffset;

  const cancelSpring = useCallback(() => {
    if (springRaf.current) {
      cancelAnimationFrame(springRaf.current);
      springRaf.current = 0;
    }
  }, []);

  const springTo = useCallback(
    (target: { x: number; y: number }) => {
      cancelSpring();
      let x = dragOffsetRef.current.x;
      let y = dragOffsetRef.current.y;
      let vx = 0;
      let vy = 0;

      const stiffness = 0.22;
      const damping = 0.78;

      const tick = () => {
        vx += (target.x - x) * stiffness;
        vy += (target.y - y) * stiffness;
        vx *= damping;
        vy *= damping;
        x += vx;
        y += vy;

        dragOffsetRef.current = { x, y };
        setDragOffset({ x, y });

        const dist = Math.hypot(target.x - x, target.y - y);
        const speed = Math.hypot(vx, vy);
        if (dist < 0.35 && speed < 0.04) {
          dragOffsetRef.current = target;
          setDragOffset(target);
          springRaf.current = 0;
          return;
        }
        springRaf.current = requestAnimationFrame(tick);
      };

      springRaf.current = requestAnimationFrame(tick);
    },
    [cancelSpring],
  );

  useEffect(() => {
    return () => cancelSpring();
  }, [cancelSpring]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      if (elapsed >= 1) {
        setFps(Math.round(frameCount / elapsed));
        setFrameCount(0);
        setLastTime(now);
      }
    }, 100);

    const animationFrame = () => {
      setFrameCount((prev) => prev + 1);
      requestAnimationFrame(animationFrame);
    };
    animationFrame();

    return () => clearInterval(interval);
  }, [frameCount, lastTime]);

  const defaultMetrics: HUDMetrics = {
    fps,
    atomCount: 9856,
    chainCount: 2,
    simulationTime: 1234.5,
    temperature: 298.15,
    energy: -8942.3,
    selectedResidue: 'GLU 42',
  };

  const displayMetrics = { ...defaultMetrics, ...customMetrics };

  const handleHudPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    cancelSpring();
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

    const boundsEl = canvasRef?.current;
    const hudEl = hudWrapRef.current;
    if (boundsEl && hudEl) {
      const bounds = boundsEl.getBoundingClientRect();
      const hudRect = hudEl.getBoundingClientRect();
      const next = computeOffsetToContainHudInBounds(bounds, hudRect, dragOffsetRef.current);
      if (next) springTo(next);
    }
  };

  if (!visible) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      ref={hudWrapRef}
      className={`fixed ${positionClasses[position]} z-40 pointer-events-none`}
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
    >
      <div className="bg-black/60 backdrop-blur-sm border border-border p-3 rounded-none font-mono text-xs text-muted-foreground space-y-1 pointer-events-none">
        {/* Header — drag by top-right grip */}
        <div className="flex justify-between items-center gap-2 mb-2">
          <div className="text-accent font-medium uppercase tracking-wider select-none">
            BIOLABS HUD
          </div>
          <button
            type="button"
            className="pointer-events-auto shrink-0 p-1 -m-1 -mr-0.5 text-muted-foreground hover:text-accent cursor-grab active:cursor-grabbing touch-none select-none outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-none"
            aria-label="HUD 위치 이동"
            title="드래그하여 이동"
            onPointerDown={handleHudPointerDown}
            onPointerMove={handleHudPointerMove}
            onPointerUp={handleHudPointerUp}
            onPointerCancel={handleHudPointerUp}
          >
            <GripVertical className="size-3.5 opacity-80" strokeWidth={2} />
          </button>
        </div>

        {/* Metrics */}
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span>FPS</span>
            <span className="text-foreground">{displayMetrics.fps}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Atoms</span>
            <span className="text-foreground">{displayMetrics.atomCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Chains</span>
            <span className="text-foreground">{displayMetrics.chainCount}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-2" />

        {/* Simulation State */}
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span>Time (ps)</span>
            <span className="text-foreground">{displayMetrics.simulationTime.toFixed(1)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Temp (K)</span>
            <span className="text-foreground">{displayMetrics.temperature.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Energy</span>
            <span className="text-foreground">{displayMetrics.energy.toFixed(1)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-2" />

        {/* Selection */}
        <div className="flex justify-between gap-4">
          <span>Selected</span>
          <span className="text-accent">{displayMetrics.selectedResidue}</span>
        </div>
      </div>
    </div>
  );
}
