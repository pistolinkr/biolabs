import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

const STORAGE_KEY = "biolabs.viewport.sequenceDockHeight.v1";
const SEQUENCE_DOCK_HEIGHT_EVENT = "biolabs:sequenceDockHeight";
const DEFAULT_HEIGHT = 200;
export const SEQUENCE_DOCK_MIN_HEIGHT = 96;
export const SEQUENCE_DOCK_MAX_HEIGHT = 480;
export const SEQUENCE_DOCK_DEFAULT_HEIGHT = DEFAULT_HEIGHT;
const MIN_DOCK_HEIGHT = SEQUENCE_DOCK_MIN_HEIGHT;
const MIN_VIEWPORT_HEIGHT = 160;

function loadStoredHeight(): number {
  if (typeof window === "undefined") return DEFAULT_HEIGHT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HEIGHT;
    const n = Number(JSON.parse(raw));
    return Number.isFinite(n) ? n : DEFAULT_HEIGHT;
  } catch {
    return DEFAULT_HEIGHT;
  }
}

function saveHeight(height: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(height));
  } catch {
    /* quota */
  }
}

/** Read the persisted sequence dock height (for settings UI). */
export function getStoredSequenceDockHeight(): number {
  return loadStoredHeight();
}

/** Persist a sequence dock height and notify any live viewport instance. */
export function setStoredSequenceDockHeight(height: number): void {
  saveHeight(height);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<number>(SEQUENCE_DOCK_HEIGHT_EVENT, { detail: height }));
  }
}

function clampHeight(height: number, maxHeight: number): number {
  const max = Math.max(MIN_DOCK_HEIGHT, maxHeight);
  return Math.min(max, Math.max(MIN_DOCK_HEIGHT, height));
}

export function useSequenceDockHeight(columnRef: RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState(loadStoredHeight);
  const [resizing, setResizing] = useState(false);
  const heightRef = useRef(height);
  const dragRef = useRef<{ pointerId: number; startY: number; originHeight: number } | null>(null);

  useEffect(() => {
    heightRef.current = height;
  }, [height]);

  const maxDockHeight = useCallback(() => {
    const columnH = columnRef.current?.clientHeight ?? 480;
    return columnH - MIN_VIEWPORT_HEIGHT;
  }, [columnRef]);

  useEffect(() => {
    const el = columnRef.current;
    if (!el) return;
    const reclamp = () => {
      setHeight((prev) => clampHeight(prev, maxDockHeight()));
    };
    const ro = new ResizeObserver(reclamp);
    ro.observe(el);
    return () => ro.disconnect();
  }, [columnRef, maxDockHeight]);

  useEffect(() => {
    const onExternalHeight = (e: Event) => {
      const next = (e as CustomEvent<number>).detail;
      if (typeof next === "number" && Number.isFinite(next)) {
        setHeight(clampHeight(next, maxDockHeight()));
      }
    };
    window.addEventListener(SEQUENCE_DOCK_HEIGHT_EVENT, onExternalHeight as EventListener);
    return () =>
      window.removeEventListener(SEQUENCE_DOCK_HEIGHT_EVENT, onExternalHeight as EventListener);
  }, [maxDockHeight]);

  const onResizePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        originHeight: heightRef.current,
      };
      setResizing(true);
    },
    [],
  );

  const onResizePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      e.preventDefault();
      const delta = drag.startY - e.clientY;
      setHeight(clampHeight(drag.originHeight + delta, maxDockHeight()));
    },
    [maxDockHeight],
  );

  const endResize = useCallback((e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setResizing(false);
    saveHeight(heightRef.current);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const resizeHandleProps = {
    onPointerDown: onResizePointerDown,
    onPointerMove: onResizePointerMove,
    onPointerUp: endResize,
    onPointerCancel: endResize,
  };

  return { height, resizing, resizeHandleProps };
}
