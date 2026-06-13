import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export interface PanelSize {
  width: number;
  height: number;
}

export interface PanelPosition {
  left: number;
  top: number;
}

/** Adobe-style resize directions: 4 edges + 4 corners. */
export type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/** Gap kept between a panel and the container edge. */
const MARGIN = 8;
/** Magnetic snap distance when dragging near a container edge. */
const SNAP = 10;

export type DockedEdges = {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
};

const NO_DOCKED_EDGES: DockedEdges = { left: false, right: false, top: false, bottom: false };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function detectDockedEdges(
  left: number,
  top: number,
  width: number,
  height: number,
  maxW: number,
  maxH: number,
): DockedEdges {
  return {
    left: Math.abs(left - MARGIN) < 1,
    right: Math.abs(left + width - (maxW - MARGIN)) < 1,
    top: Math.abs(top - MARGIN) < 1,
    bottom: Math.abs(top + height - (maxH - MARGIN)) < 1,
  };
}

function anyEdgeDocked(docked: DockedEdges): boolean {
  return docked.left || docked.right || docked.top || docked.bottom;
}

/** Re-anchor panel to edges it was glued to (survives container resize). */
function applyDockedEdges(
  left: number,
  top: number,
  width: number,
  height: number,
  maxW: number,
  maxH: number,
  docked: DockedEdges,
): PanelPosition {
  let nextLeft = left;
  let nextTop = top;
  if (docked.right) nextLeft = maxW - MARGIN - width;
  else if (docked.left) nextLeft = MARGIN;
  if (docked.bottom) nextTop = maxH - MARGIN - height;
  else if (docked.top) nextTop = MARGIN;
  return { left: nextLeft, top: nextTop };
}

export interface UseFloatingPanelLayoutOptions {
  defaultSize: PanelSize;
  minSize?: PanelSize;
  maxSize?: PanelSize;
  defaultPosition?: PanelPosition;
}

export function useFloatingPanelLayout(
  containerRef: RefObject<HTMLElement | null>,
  {
    defaultSize,
    minSize = { width: 220, height: 120 },
    maxSize = { width: 560, height: 640 },
    defaultPosition = { left: 16, top: 16 },
  }: UseFloatingPanelLayoutOptions,
) {
  const [position, setPosition] = useState<PanelPosition>(defaultPosition);
  const [size, setSize] = useState<PanelSize>(defaultSize);
  const [positionPinned, setPositionPinned] = useState(false);
  const [dockedEdges, setDockedEdges] = useState<DockedEdges>(NO_DOCKED_EDGES);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const clampSizeRef = useRef<PanelSize>(defaultSize);
  const dockedEdgesRef = useRef<DockedEdges>(NO_DOCKED_EDGES);

  useEffect(() => {
    dockedEdgesRef.current = dockedEdges;
  }, [dockedEdges]);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);

  const resizeRef = useRef<{
    pointerId: number;
    direction: ResizeDirection;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    originWidth: number;
    originHeight: number;
  } | null>(null);

  const containerBounds = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 640, height: rect?.height ?? 480 };
  }, [containerRef]);

  const clampPanelPosition = useCallback(
    (left: number, top: number, width?: number, height?: number): PanelPosition => {
      const { width: maxW, height: maxH } = containerBounds();
      const w = width ?? clampSizeRef.current.width;
      const h = height ?? clampSizeRef.current.height;
      return {
        left: clamp(left, MARGIN, Math.max(MARGIN, maxW - w - MARGIN)),
        top: clamp(top, MARGIN, Math.max(MARGIN, maxH - h - MARGIN)),
      };
    },
    [containerBounds],
  );

  /** Snap a dragged position to nearby container edges (magnetic feel). */
  const snapPanelPosition = useCallback(
    (left: number, top: number, width: number, height: number): PanelPosition => {
      const { width: maxW, height: maxH } = containerBounds();
      let nextLeft = left;
      let nextTop = top;
      if (Math.abs(left - MARGIN) <= SNAP) nextLeft = MARGIN;
      else if (Math.abs(left + width - (maxW - MARGIN)) <= SNAP) nextLeft = maxW - MARGIN - width;
      if (Math.abs(top - MARGIN) <= SNAP) nextTop = MARGIN;
      else if (Math.abs(top + height - (maxH - MARGIN)) <= SNAP) nextTop = maxH - MARGIN - height;
      return { left: nextLeft, top: nextTop };
    },
    [containerBounds],
  );

  const setClampSize = useCallback((next: PanelSize) => {
    clampSizeRef.current = next;
  }, []);

  /** Reclamp when the container shrinks (e.g. dock split resize) — window resize alone misses this. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reclampToContainer = () => {
      const { width, height } = clampSizeRef.current;
      const { width: maxW, height: maxH } = containerBounds();
      setPosition((prev) => {
        const anchored = applyDockedEdges(
          prev.left,
          prev.top,
          width,
          height,
          maxW,
          maxH,
          dockedEdgesRef.current,
        );
        return clampPanelPosition(anchored.left, anchored.top, width, height);
      });
    };

    const ro = new ResizeObserver(reclampToContainer);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clampPanelPosition, containerBounds, containerRef]);

  const clampPanelSize = useCallback(
    (width: number, height: number): PanelSize => ({
      width: clamp(width, minSize.width, maxSize.width),
      height: clamp(height, minSize.height, maxSize.height),
    }),
    [maxSize.height, maxSize.width, minSize.height, minSize.width],
  );

  // ---- Drag (move) ----

  const onDragHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originLeft: position.left,
        originTop: position.top,
      };
      setDragging(true);
    },
    [position.left, position.top],
  );

  const onDragHandlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      e.preventDefault();
      setPositionPinned(true);
      const { width, height } = clampSizeRef.current;
      const rawLeft = drag.originLeft + (e.clientX - drag.startX);
      const rawTop = drag.originTop + (e.clientY - drag.startY);
      const snapped = snapPanelPosition(rawLeft, rawTop, width, height);
      setPosition(clampPanelPosition(snapped.left, snapped.top, width, height));
    },
    [clampPanelPosition, snapPanelPosition],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      dragRef.current = null;
      setDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      const { width, height } = clampSizeRef.current;
      setPosition((prev) => {
        const snapped = snapPanelPosition(prev.left, prev.top, width, height);
        const clamped = clampPanelPosition(snapped.left, snapped.top, width, height);
        const { width: maxW, height: maxH } = containerBounds();
        setDockedEdges(detectDockedEdges(clamped.left, clamped.top, width, height, maxW, maxH));
        return clamped;
      });
    },
    [clampPanelPosition, containerBounds, snapPanelPosition],
  );

  // ---- Resize (8-way, opposite edge anchored, container-constrained) ----

  const onResizePointerDown = useCallback(
    (direction: ResizeDirection) => (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      resizeRef.current = {
        pointerId: e.pointerId,
        direction,
        startX: e.clientX,
        startY: e.clientY,
        originLeft: position.left,
        originTop: position.top,
        originWidth: size.width,
        originHeight: size.height,
      };
      setPositionPinned(true);
      setResizing(true);
    },
    [position.left, position.top, size.height, size.width],
  );

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const resize = resizeRef.current;
      if (!resize || resize.pointerId !== e.pointerId) return;
      e.preventDefault();
      e.stopPropagation();

      const { direction, originLeft, originTop, originWidth, originHeight } = resize;
      const dx = e.clientX - resize.startX;
      const dy = e.clientY - resize.startY;
      const { width: maxW, height: maxH } = containerBounds();

      let left = originLeft;
      let top = originTop;
      let width = originWidth;
      let height = originHeight;

      const anchorRight = originLeft + originWidth;
      const anchorBottom = originTop + originHeight;

      if (direction.includes("e")) {
        const availW = maxW - MARGIN - originLeft;
        width = clamp(originWidth + dx, minSize.width, Math.min(maxSize.width, availW));
      } else if (direction.includes("w")) {
        const availW = anchorRight - MARGIN;
        width = clamp(originWidth - dx, minSize.width, Math.min(maxSize.width, availW));
        left = anchorRight - width;
      }

      if (direction.includes("s")) {
        const availH = maxH - MARGIN - originTop;
        height = clamp(originHeight + dy, minSize.height, Math.min(maxSize.height, availH));
      } else if (direction.includes("n")) {
        const availH = anchorBottom - MARGIN;
        height = clamp(originHeight - dy, minSize.height, Math.min(maxSize.height, availH));
        top = anchorBottom - height;
      }

      clampSizeRef.current = { width, height };
      setSize({ width, height });

      const docked = dockedEdgesRef.current;
      if (docked.right) left = maxW - MARGIN - width;
      else if (docked.left) left = MARGIN;
      if (docked.bottom) top = maxH - MARGIN - height;
      else if (docked.top) top = MARGIN;

      setPosition({ left, top });
    },
    [containerBounds, maxSize.height, maxSize.width, minSize.height, minSize.width],
  );

  const endResize = useCallback(
    (e: React.PointerEvent) => {
      const resize = resizeRef.current;
      if (!resize || resize.pointerId !== e.pointerId) return;
      resizeRef.current = null;
      setResizing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      const { width, height } = clampSizeRef.current;
      setPosition((prev) => {
        const { width: maxW, height: maxH } = containerBounds();
        const clamped = clampPanelPosition(prev.left, prev.top, width, height);
        setDockedEdges(detectDockedEdges(clamped.left, clamped.top, width, height, maxW, maxH));
        return clamped;
      });
    },
    [clampPanelPosition, containerBounds],
  );

  const dragHandleProps = {
    onPointerDown: onDragHandlePointerDown,
    onPointerMove: onDragHandlePointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  /** Returns pointer handlers bound to a specific resize direction. */
  const getResizeHandleProps = useCallback(
    (direction: ResizeDirection) => ({
      onPointerDown: onResizePointerDown(direction),
      onPointerMove: onResizePointerMove,
      onPointerUp: endResize,
      onPointerCancel: endResize,
    }),
    [onResizePointerDown, onResizePointerMove, endResize],
  );

  const reclampPosition = useCallback(() => {
    const { width, height } = clampSizeRef.current;
    const { width: maxW, height: maxH } = containerBounds();
    setPosition((prev) => {
      const anchored = applyDockedEdges(
        prev.left,
        prev.top,
        width,
        height,
        maxW,
        maxH,
        dockedEdgesRef.current,
      );
      return clampPanelPosition(anchored.left, anchored.top, width, height);
    });
  }, [clampPanelPosition, containerBounds]);

  return {
    position,
    setPosition,
    size,
    setSize,
    setClampSize,
    positionPinned,
    setPositionPinned,
    dockedEdges,
    edgeDocked: anyEdgeDocked(dockedEdges),
    /** True when the user dragged or the panel is snapped to a container edge. */
    positionLocked: positionPinned || anyEdgeDocked(dockedEdges),
    dragging,
    resizing,
    clampPanelPosition,
    clampPanelSize,
    reclampPosition,
    dragHandleProps,
    getResizeHandleProps,
  };
}
