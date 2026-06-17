import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

const MIN_PRIMARY_HEIGHT = 160;

function clampAssistantHeight(height: number, maxHeight: number, minAssistantHeight: number): number {
  const max = Math.max(minAssistantHeight, maxHeight);
  return Math.min(max, Math.max(minAssistantHeight, Math.round(height)));
}

export function usePhaeleonAssistantStackHeight({
  stackRef,
  height,
  minAssistantHeight,
  onHeightCommit,
}: {
  stackRef: RefObject<HTMLElement | null>;
  height: number;
  minAssistantHeight: number;
  onHeightCommit: (height: number) => void;
}) {
  const [localHeight, setLocalHeight] = useState(height);
  const [resizing, setResizing] = useState(false);
  const heightRef = useRef(localHeight);
  const dragRef = useRef<{ pointerId: number; startY: number; originHeight: number } | null>(null);

  useEffect(() => {
    setLocalHeight(height);
  }, [height]);

  useEffect(() => {
    heightRef.current = localHeight;
  }, [localHeight]);

  const maxAssistantHeight = useCallback(() => {
    const stackH = stackRef.current?.clientHeight ?? 480;
    return stackH - MIN_PRIMARY_HEIGHT;
  }, [stackRef]);

  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const reclamp = () => {
      setLocalHeight((prev) => clampAssistantHeight(prev, maxAssistantHeight(), minAssistantHeight));
    };
    const ro = new ResizeObserver(reclamp);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stackRef, maxAssistantHeight, minAssistantHeight]);

  const onResizePointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      originHeight: heightRef.current,
    };
    setResizing(true);
  }, []);

  const onResizePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      e.preventDefault();
      const delta = drag.startY - e.clientY;
      setLocalHeight(clampAssistantHeight(drag.originHeight + delta, maxAssistantHeight(), minAssistantHeight));
    },
    [maxAssistantHeight, minAssistantHeight],
  );

  const endResize = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      dragRef.current = null;
      setResizing(false);
      onHeightCommit(heightRef.current);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [onHeightCommit],
  );

  const resizeHandleProps = {
    onPointerDown: onResizePointerDown,
    onPointerMove: onResizePointerMove,
    onPointerUp: endResize,
    onPointerCancel: endResize,
  };

  return { assistantHeight: localHeight, resizing, resizeHandleProps };
}
