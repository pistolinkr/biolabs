import { useEffect, useState } from "react";

/** Phaeleon tablet breakpoint — inspector moves to sheet. */
export const COMPACT_WORKSTATION_BREAKPOINT = 1024;

export function useCompactWorkstation(breakpoint = COMPACT_WORKSTATION_BREAKPOINT): boolean {
  const [compact, setCompact] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setCompact(window.innerWidth < breakpoint);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return compact;
}
