import { Stage } from "ngl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ProteinSelection } from "@/lib/proteinApis";
import { resolveStructure } from "@/lib/structureSources";

export interface StructureViewportProps {
  selection: ProteinSelection | null;
  className?: string;
}

/**
 * NGL WebGL viewport: loads mmCIF / PDB from RCSB or AlphaFold (via resolveStructure).
 */
export default function StructureViewport({ selection, className = "" }: StructureViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const [overlay, setOverlay] = useState<{ kind: "idle" | "loading" | "error"; text?: string }>({
    kind: "idle",
    text: undefined,
  });

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const stage = new Stage(el, {
      backgroundColor: "#0a0a0a",
      quality: "medium",
      workerDefault: false,
    });
    stageRef.current = stage;

    const ro = new ResizeObserver(() => {
      stage.handleResize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      stage.dispose();
      stageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let cancelled = false;

    const run = async () => {
      if (!selection) {
        stage.removeAllComponents();
        setOverlay({
          kind: "idle",
          text: "Search and select a structure to load",
        });
        return;
      }

      setOverlay({ kind: "loading", text: "Loading structure…" });

      try {
        const resolved = await resolveStructure(selection);
        if (cancelled) return;

        stage.removeAllComponents();
        await stage.loadFile(resolved.url, {
          ext: resolved.format,
          defaultRepresentation: true,
        });
        if (cancelled) return;

        stage.autoView();
        setOverlay({ kind: "idle", text: undefined });
        toast.success(resolved.provenance);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load structure";
        setOverlay({ kind: "error", text: msg });
        toast.error(msg);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [selection]);

  return (
    <div className={`relative h-full w-full min-h-0 min-w-0 ${className}`}>
      <div ref={hostRef} className="absolute inset-0 h-full w-full touch-none" />

      {selection === null && overlay.kind === "idle" ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
          <span className="text-sm text-muted-foreground">WebGL viewport</span>
          <span className="text-xs text-muted-foreground/80">NGL · RCSB / UniProt / AlphaFold</span>
        </div>
      ) : null}

      {overlay.kind === "loading" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0A0A0A]/50">
          <span className="rounded-none border border-border bg-background/90 px-3 py-2 font-mono text-xs text-foreground">
            {overlay.text}
          </span>
        </div>
      ) : null}

      {overlay.kind === "error" && overlay.text ? (
        <div className="absolute inset-x-0 bottom-0 border-t border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
          {overlay.text}
        </div>
      ) : null}
    </div>
  );
}
