import { Stage, StructureComponent, type PickingProxy } from "ngl";
import { startTransition, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useViewer, type ContextContactRadiusAngstrom, type SequencePolymerKind, type ViewportPickDetail } from "@/contexts/ViewerContext";
import { resolveStructure } from "@/lib/structureSources";
import { buildHierarchyFromStructure } from "@/lib/structureModelFromNgl";
import { applyMainRepresentation } from "@/lib/nglRepr";
import { handleViewportMeasurementPick } from "@/lib/nglMeasurement";
import { applyRelativeDepthFog } from "@/lib/nglViewportTune";
import { applyPolymerContextHighlight, resolveStripSelectionFromPick } from "@/lib/nglSequenceNeighborhood";
import { nglFitSelection } from "@/lib/nglViewportActions";
import { viewportBackgroundColor } from "@/lib/themeColors";
import { useResolvedTheme } from "@/contexts/ThemeContext";

/** Softer key + fill for dark background — avoids blown-out, neon-like chain colors. */
const VIEWPORT_LIGHTING = {
  lightIntensity: 1.05,
  ambientIntensity: 0.3,
} as const;

/** Delay before showing repr overlay — avoids flash on fast updates. */
const REPR_LOADING_DELAY_MS = 200;

function pickAtomFromProxy(pickingProxy: unknown): Record<string, unknown> | null {
  if (!pickingProxy || typeof pickingProxy !== "object") return null;
  const p = pickingProxy as { atom?: unknown; closestBondAtom?: unknown };
  const raw = p.atom ?? p.closestBondAtom;
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}

function detailFromAtomProxy(atom: Record<string, unknown>): ViewportPickDetail | null {
  const chain = String(atom.chainname ?? atom.chainid ?? "?");
  const resno = Number(atom.resno);
  const resname = String(atom.resname ?? "???");
  if (!Number.isFinite(resno)) return null;
  const x = Number(atom.x);
  const y = Number(atom.y);
  const z = Number(atom.z);
  const hasXYZ = Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
  return { chain, resno, resname, ...(hasXYZ ? { x, y, z } : {}) };
}

/**
 * NGL WebGL viewport — loads mmCIF/PDB; viewer state from ViewerContext.
 */
export default function StructureViewport({ className = "" }: { className?: string }) {
  const {
    proteinSelection: selection,
    setStructureModel,
    registerStage,
    registerStructureComponent,
    structureComponentRef,
    representation,
    colorScheme,
    isolateChainId,
    renderOptions,
    reprGeneration,
    requestReprRefresh,
    nglQuality,
    setSelectedResidueKey,
    setViewportPickDetail,
    setViewportPickAnchor,
    applyViewportResiduePick,
    selectedResidueKey,
    selectedSequencePolymerKind,
    viewportPickDetail,
    contextContactRadiusAngstrom,
    setPolymerContextSnapshot,
    structureModel,
    polymerInteractionOverlayEnabled,
    nucleicBackboneAccentEnabled,
    measurementMode,
  } = useViewer();
  const resolvedTheme = useResolvedTheme();

  const hostRef = useRef<HTMLDivElement>(null);
  const localStageRef = useRef<Stage | null>(null);
  const fileObjectUrlRef = useRef<string | null>(null);
  /** Avoid re-framing on context-radius / overlay changes; refocus only on new sequence-strip clicks. */
  const lastSequenceCameraFocusRef = useRef<string | null>(null);
  const structureTitle = structureModel?.title ?? "";
  const polymerCtxRef = useRef({
    viewportPickDetail: null as ViewportPickDetail | null,
    selectedResidueKey: null as string | null,
    selectedSequencePolymerKind: null as SequencePolymerKind | null,
    contextContactRadiusAngstrom: 6 as ContextContactRadiusAngstrom,
    showInteractionOverlay: true,
    nucleicBackboneAccent: false,
    structureTitle: "",
  });
  polymerCtxRef.current = {
    viewportPickDetail,
    selectedResidueKey,
    selectedSequencePolymerKind,
    contextContactRadiusAngstrom,
    showInteractionOverlay: polymerInteractionOverlayEnabled,
    nucleicBackboneAccent: nucleicBackboneAccentEnabled,
    structureTitle,
  };
  const [overlay, setOverlay] = useState<{ kind: "idle" | "loading" | "error"; text?: string }>({
    kind: "idle",
    text: undefined,
  });
  /** Display/repr updates (mode, color, transparency, chain visibility…) — same overlay style as structure load when slow. */
  const [reprLoading, setReprLoading] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const stage = new Stage(el, {
      backgroundColor: viewportBackgroundColor(),
      quality: "medium",
      workerDefault: true,
      ...VIEWPORT_LIGHTING,
    });
    localStageRef.current = stage;
    registerStage(stage);
    try {
      stage.setParameters({
        ...VIEWPORT_LIGHTING,
      });
    } catch {
      /* */
    }

    let roRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(roRaf);
      roRaf = requestAnimationFrame(() => {
        stage.handleResize();
      });
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(roRaf);
      ro.disconnect();
      registerStage(null);
      registerStructureComponent(null);
      setStructureModel(null);
      stage.dispose();
      localStageRef.current = null;
    };
  }, [registerStage, registerStructureComponent, setStructureModel]);

  useEffect(() => {
    const stage = localStageRef.current;
    if (!stage) return;
    const onPick = (pickingProxy: unknown) => {
      try {
        if (measurementMode !== "none") {
          handleViewportMeasurementPick(stage, pickingProxy as PickingProxy | null, measurementMode);
          return;
        }
        if (!pickingProxy) {
          setViewportPickDetail(null);
          setSelectedResidueKey(null);
          return;
        }
        const atom = pickAtomFromProxy(pickingProxy);
        if (!atom) {
          setViewportPickDetail(null);
          setSelectedResidueKey(null);
          return;
        }
        const d = detailFromAtomProxy(atom);
        if (!d) {
          setViewportPickDetail(null);
          setSelectedResidueKey(null);
          return;
        }
        const sc = structureComponentRef.current;
        const stripSel = sc ? resolveStripSelectionFromPick(sc, d.chain, d.resno) : null;
        applyViewportResiduePick(d, stripSel);
      } catch {
        setViewportPickDetail(null);
        setSelectedResidueKey(null);
      }
    };
    stage.signals.clicked.add(onPick);
    return () => {
      try {
        stage.signals.clicked.remove(onPick);
      } catch {
        /* */
      }
    };
  }, [applyViewportResiduePick, measurementMode, setSelectedResidueKey, setViewportPickDetail, setViewportPickAnchor, structureComponentRef]);

  useEffect(() => {
    const stage = localStageRef.current;
    if (!stage) return;
    try {
      stage.setQuality(nglQuality);
      requestReprRefresh();
    } catch {
      /* */
    }
  }, [nglQuality, requestReprRefresh]);

  useEffect(() => {
    const stage = localStageRef.current;
    if (!stage) return;
    try {
      stage.setParameters({ backgroundColor: viewportBackgroundColor() } as never);
    } catch {
      /* */
    }
  }, [resolvedTheme]);

  useEffect(() => {
    lastSequenceCameraFocusRef.current = null;
  }, [selection, structureModel?.title]);

  useEffect(() => {
    const st = localStageRef.current;
    applyRelativeDepthFog(st, renderOptions.depthCue);
  }, [renderOptions.depthCue, reprGeneration, selection]);

  useEffect(() => {
    const next =
      selection?.source === "file" && selection.structureObjectUrl ? selection.structureObjectUrl : null;
    if (fileObjectUrlRef.current && fileObjectUrlRef.current !== next) {
      URL.revokeObjectURL(fileObjectUrlRef.current);
    }
    fileObjectUrlRef.current = next;
  }, [selection]);

  useEffect(() => {
    return () => {
      if (fileObjectUrlRef.current) {
        URL.revokeObjectURL(fileObjectUrlRef.current);
        fileObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const stage = localStageRef.current;
    if (!stage) return;

    let cancelled = false;

    const run = async () => {
      if (!selection) {
        stage.removeAllComponents();
        registerStructureComponent(null);
        setStructureModel(null);
        setReprLoading(false);
        setOverlay({
          kind: "idle",
          text: "Select structure source → load entry",
        });
        return;
      }

      setReprLoading(false);
      setOverlay({ kind: "loading", text: "Loading structure…" });

      try {
        const resolved = await resolveStructure(selection);
        if (cancelled) return;

        stage.removeAllComponents();
        registerStructureComponent(null);

        const loaded = await stage.loadFile(resolved.url, {
          ext: resolved.format,
          defaultRepresentation: false,
        });
        if (cancelled) return;

        const component =
          loaded instanceof StructureComponent
            ? loaded
            : stage.compList.filter((c) => c instanceof StructureComponent).at(-1);

        if (component instanceof StructureComponent) {
          registerStructureComponent(component);
          try {
            applyMainRepresentation(component, representation, colorScheme, {
              isolateChainId,
              transparent: renderOptions.transparency,
            });
            applyRelativeDepthFog(stage, renderOptions.depthCue);
          } catch {
            /* repr will retry via requestReprRefresh */
          }
          const label = selection.label.split("—")[0]?.trim() ?? selection.id;
          queueMicrotask(() => {
            if (cancelled) return;
            startTransition(() => {
              setStructureModel(buildHierarchyFromStructure(component, label));
            });
          });
          requestReprRefresh();
        }

        requestAnimationFrame(() => {
          if (cancelled) return;
          try {
            stage.autoView();
            stage.handleResize();
          } catch {
            /* */
          }
          setOverlay({ kind: "idle", text: undefined });
        });
        if (typeof requestIdleCallback === "function") {
          requestIdleCallback(
            () => {
              if (cancelled) return;
              toast.success(resolved.provenance);
            },
            { timeout: 900 },
          );
        } else {
          setTimeout(() => {
            if (cancelled) return;
            toast.success(resolved.provenance);
          }, 0);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load structure";
        setOverlay({ kind: "error", text: msg });
        toast.error(msg);
        registerStructureComponent(null);
        setStructureModel(null);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [selection, setStructureModel, registerStructureComponent, requestReprRefresh]);

  useEffect(() => {
    const sc = structureComponentRef.current;
    const stage = localStageRef.current;
    if (!sc || !stage) {
      setReprLoading(false);
      return;
    }
    let cancelled = false;
    const raf1Ref = { id: 0 };
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setReprLoading(true);
    }, REPR_LOADING_DELAY_MS);

    const clearReprLoading = () => {
      window.clearTimeout(slowTimer);
      setReprLoading(false);
    };

    const raf0 = requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        applyMainRepresentation(sc, representation, colorScheme, {
          isolateChainId,
          transparent: renderOptions.transparency,
        });
        stage.handleResize();
      } catch {
        clearReprLoading();
        return;
      }
      raf1Ref.id = requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          stage.handleResize();
        } catch {
          /* */
        } finally {
          applyRelativeDepthFog(stage, renderOptions.depthCue);
          clearReprLoading();
          const r = polymerCtxRef.current;
          applyPolymerContextHighlight(sc, stage, {
            viewportPick: r.viewportPickDetail,
            selectedResidueKey: r.selectedResidueKey,
            selectedSequencePolymerKind: r.selectedSequencePolymerKind,
            contactRadius: r.contextContactRadiusAngstrom,
            contactPreset: r.contextContactRadiusAngstrom,
            moveCamera: false,
            showInteractionOverlay: r.showInteractionOverlay,
            nucleicBackboneAccent: r.nucleicBackboneAccent,
            structureTitle: r.structureTitle,
          });
        }
      });
    });
    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      cancelAnimationFrame(raf0);
      cancelAnimationFrame(raf1Ref.id);
      setReprLoading(false);
    };
  }, [
    reprGeneration,
    representation,
    colorScheme,
    isolateChainId,
    renderOptions.transparency,
    renderOptions.depthCue,
    structureComponentRef,
    polymerInteractionOverlayEnabled,
    nucleicBackboneAccentEnabled,
    structureTitle,
    structureModel?.atomCount,
  ]);

  useEffect(() => {
    const sc = structureComponentRef.current;
    const stage = localStageRef.current;
    if (!sc || !stage) {
      setPolymerContextSnapshot(null);
      return;
    }

    let moveCamera = false;
    if (selectedSequencePolymerKind && selectedResidueKey) {
      const focusKey = `${selectedSequencePolymerKind}:${selectedResidueKey}`;
      if (focusKey !== lastSequenceCameraFocusRef.current) {
        moveCamera = true;
        lastSequenceCameraFocusRef.current = focusKey;
      }
    } else {
      lastSequenceCameraFocusRef.current = null;
    }

    const snap = applyPolymerContextHighlight(sc, stage, {
      viewportPick: viewportPickDetail,
      selectedResidueKey,
      selectedSequencePolymerKind,
      contactRadius: contextContactRadiusAngstrom,
      contactPreset: contextContactRadiusAngstrom,
      moveCamera,
      showInteractionOverlay: polymerInteractionOverlayEnabled,
      nucleicBackboneAccent: nucleicBackboneAccentEnabled,
      structureTitle,
    });
    if (moveCamera && !snap && selectedResidueKey) {
      nglFitSelection(stage, sc, null, selectedResidueKey);
    }
    setPolymerContextSnapshot(snap);
  }, [
    selectedResidueKey,
    selectedSequencePolymerKind,
    viewportPickDetail,
    contextContactRadiusAngstrom,
    structureComponentRef,
    setPolymerContextSnapshot,
    polymerInteractionOverlayEnabled,
    nucleicBackboneAccentEnabled,
    structureTitle,
  ]);

  return (
    <div className={`relative h-full w-full min-h-0 min-w-0 overflow-hidden ${className}`}>
      <div
        ref={hostRef}
        className="absolute inset-0 h-full w-full min-h-0 touch-none overflow-hidden"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          setViewportPickAnchor({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
        }}
      />

      {selection === null && overlay.kind === "idle" ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center font-mono">
          <span className="text-[11px] uppercase tracking-widest text-[#8A8A8A]">Viewport idle</span>
          <span className="text-[10px] text-[#6A6A6A]">NGL · RCSB / UniProt / AlphaFold DB</span>
        </div>
      ) : null}

      {overlay.kind === "loading" || reprLoading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60">
          <span className="border border-border bg-card px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-foreground">
            {overlay.kind === "loading"
              ? overlay.text
              : "Updating structure display…"}
          </span>
        </div>
      ) : null}

      {overlay.kind === "error" && overlay.text ? (
        <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 px-3 py-2 font-mono text-[10px] text-destructive">
          {overlay.text}
        </div>
      ) : null}
    </div>
  );
}
