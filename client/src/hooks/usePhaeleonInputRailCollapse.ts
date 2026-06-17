import { useCallback, useEffect, useState } from "react";

const INPUT_RAIL_SPRING = { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.85 };

export const PHAELEON_INPUT_RAIL_COLLAPSED_PX = 48;

/** Collapse minimal input rail after pair is ready or on narrow viewports. */
export function usePhaeleonInputRailCollapse(pairReady: boolean) {
  const [userExpanded, setUserExpanded] = useState(true);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (pairReady) setUserExpanded(false);
  }, [pairReady]);

  const autoCollapse = pairReady || narrow;
  const collapsed = autoCollapse && !userExpanded;

  const expand = useCallback(() => setUserExpanded(true), []);
  const collapse = useCallback(() => setUserExpanded(false), []);
  const toggleExpanded = useCallback(() => setUserExpanded((v) => !v), []);

  return { collapsed, toggleExpanded, expand, collapse, narrow, spring: INPUT_RAIL_SPRING };
}
