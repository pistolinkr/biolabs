import { useEffect, useRef } from "react";

/** After the slim input rail collapses on a complete pair, run interaction analysis once. */
export function usePhaeleonAutoAnalyzeOnRailCollapse(params: {
  enabled: boolean;
  pairReady: boolean;
  collapsed: boolean;
  drug1Name: string | undefined;
  drug2Name: string | undefined;
  runAnalysis: () => Promise<void>;
}) {
  const { enabled, pairReady, collapsed, drug1Name, drug2Name, runAnalysis } = params;
  const analyzedPairRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pairReady) analyzedPairRef.current = null;
  }, [pairReady]);

  useEffect(() => {
    if (!enabled || !pairReady || !collapsed || !drug1Name || !drug2Name) return;

    const pairKey = `${drug1Name}::${drug2Name}`;
    if (analyzedPairRef.current === pairKey) return;
    analyzedPairRef.current = pairKey;

    const timer = window.setTimeout(() => {
      void runAnalysis();
    }, 340);

    return () => window.clearTimeout(timer);
  }, [enabled, pairReady, collapsed, drug1Name, drug2Name, runAnalysis]);
}
