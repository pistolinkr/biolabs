import React, { useMemo } from "react";
import type { PolymerProximityGraphEdge } from "@/contexts/ViewerContext";
import { useColorScheme } from "@/contexts/ThemeContext";

const W = 220;
const H = 140;
const PAD = 8;

const GRAPH_COLORS = {
  dark: {
    line: "#6A6A6A",
    nodeFill: "#2A2A2A",
    nodeFillN: "#1C2428",
    stroke: "#8A8A8A",
    text: "#B0B0B0",
  },
  light: {
    line: "#9A9A9A",
    nodeFill: "#D8D8D8",
    nodeFillN: "#C8D0D4",
    stroke: "#5A6878",
    text: "#4A4A4A",
  },
} as const;

/**
 * Minimal monochrome protein–nucleic proximity graph from residue-residue edges.
 */
export default function PolymerProximityGraph({
  edges,
  fingerprint,
}: {
  edges: PolymerProximityGraphEdge[];
  fingerprint: string;
}) {
  const scheme = useColorScheme();
  const colors = GRAPH_COLORS[scheme];
  const svgMarkup = useMemo(() => {
    if (!edges.length) return "";
    const pKeys = new Set<string>();
    const nKeys = new Set<string>();
    for (const e of edges) {
      pKeys.add(`${e.proteinChain}:${e.proteinResno}`);
      nKeys.add(`${e.nucleicChain}:${e.nucleicResno}`);
    }
    const pList = Array.from(pKeys);
    const nList = Array.from(nKeys);
    const pyStep = pList.length > 1 ? (H - 2 * PAD) / (pList.length - 1) : 0;
    const nyStep = nList.length > 1 ? (H - 2 * PAD) / (nList.length - 1) : 0;
    const posP = new Map<string, { x: number; y: number }>();
    const posN = new Map<string, { x: number; y: number }>();
    pList.forEach((k, i) => {
      posP.set(k, { x: PAD + 20, y: PAD + (pList.length === 1 ? (H - 2 * PAD) / 2 : i * pyStep) });
    });
    nList.forEach((k, i) => {
      posN.set(k, {
        x: W - PAD - 20,
        y: PAD + (nList.length === 1 ? (H - 2 * PAD) / 2 : i * nyStep),
      });
    });
    const parts: string[] = [];
    for (const e of edges) {
      const pk = `${e.proteinChain}:${e.proteinResno}`;
      const nk = `${e.nucleicChain}:${e.nucleicResno}`;
      const pa = posP.get(pk);
      const nb = posN.get(nk);
      if (!pa || !nb) continue;
      const opacity = Math.max(0.25, 1 - e.minHeavyDistanceAngstrom / 6);
      parts.push(
        `<line x1="${pa.x}" y1="${pa.y}" x2="${nb.x}" y2="${nb.y}" stroke="${colors.line}" stroke-width="0.8" opacity="${opacity.toFixed(2)}" />`,
      );
    }
    posP.forEach((pt, k) => {
      parts.push(
        `<circle cx="${pt.x}" cy="${pt.y}" r="3" fill="${colors.nodeFill}" stroke="${colors.stroke}" stroke-width="0.6" />`,
      );
      parts.push(
        `<text x="${pt.x - 4}" y="${pt.y + 3}" font-size="7" font-family="ui-monospace,monospace" fill="${colors.text}" text-anchor="end">${k}</text>`,
      );
    });
    posN.forEach((pt, k) => {
      parts.push(
        `<circle cx="${pt.x}" cy="${pt.y}" r="3" fill="${colors.nodeFillN}" stroke="${colors.stroke}" stroke-width="0.6" />`,
      );
      parts.push(
        `<text x="${pt.x + 4}" y="${pt.y + 3}" font-size="7" font-family="ui-monospace,monospace" fill="${colors.text}" text-anchor="start">${k}</text>`,
      );
    });
    return parts.join("");
  }, [edges, fingerprint, colors]);

  if (!edges.length) {
    return (
      <p className="font-mono text-[9px] leading-snug text-muted-foreground">
        No protein–nucleic residue pairs within 5 Å (heavy-atom heuristic) in the current context.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="font-mono text-[8px] text-muted-foreground truncate" title={fingerprint}>
        {fingerprint.length > 56 ? `${fingerprint.slice(0, 56)}…` : fingerprint}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full border border-border bg-background"
        aria-label="Protein to nucleic proximity graph"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </div>
  );
}
