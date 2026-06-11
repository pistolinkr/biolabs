import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Stage, StructureComponent } from "ngl";
import { toast } from "sonner";
import { i18n } from "@/i18n";
import type { ProteinSelection } from "@/lib/proteinApis";
import { proteinSelectionKey } from "@/lib/proteinApis";
import { downloadStructureCoordinates } from "@/lib/structureExport";
import {
  nglFitSelection,
  nglFitStructure,
  nglResetView,
  nglScreenshotToFile,
} from "@/lib/nglViewportActions";
import { clearViewportMeasurements } from "@/lib/nglMeasurement";
import {
  hasActivePolymerPick,
  resolvePolymerOverlayToastKey,
  structureHasNucleicChains,
  type PolymerOverlayToastKind,
} from "@/lib/polymerOverlayFeedback";
import type { BiomolecularEntityKind } from "@/lib/biomolecularEntities";
import type { VizColorSchemeId, VizRepresentationId } from "@/lib/nglRepr";
import type { StripSelectionFromPick } from "@/lib/nglSequenceNeighborhood";

export interface ChainModel {
  id: string;
  residueCount: number;
  atomCount: number;
  visible: boolean;
  entityKind: BiomolecularEntityKind;
}

export interface StructureHierarchyModel {
  title: string;
  chains: ChainModel[];
  /** Standard amino-acid 1-letter sequences per chain (protein polymer only). */
  sequenceByChain: Record<string, string>;
  /** DNA/RNA 1-letter sequences per chain (nucleic polymer only). */
  nucleicSequenceByChain: Record<string, string>;
  atomCount: number;
  residueCount: number;
  /** RCSB bioassembly — UI placeholder until metadata is loaded. */
  assemblyId?: string | null;
}

export interface ViewerRenderOptions {
  ambientOcclusion: boolean;
  shadows: boolean;
  transparency: boolean;
  edgeEnhancement: boolean;
  depthCue: boolean;
}

export type MeasurementMode = "none" | "distance" | "angle" | "dihedral";

export type NglQualityPreset = "low" | "medium" | "high";

export type SequencePolymerKind = "protein" | "nucleic";

export type ContextContactRadiusAngstrom = 4 | 6 | 10;

/** Protein–nucleic residue pair for minimal proximity graph (distance-heuristic). */
export interface PolymerProximityGraphEdge {
  proteinChain: string;
  proteinResno: number;
  nucleicChain: string;
  nucleicResno: number;
  minHeavyDistanceAngstrom: number;
}

/** Distance-based polymer neighborhood (no codon / H-bond semantics). */
export interface PolymerContextSnapshot {
  center: { x: number; y: number; z: number };
  radiusAngstrom: number;
  sele: string;
  chainsTouched: string[];
  nucleicChains: string[];
  proteinResidueCount: number;
  nucleicResidueCount: number;
  otherResidueCount: number;
  /** Short 1-letter previews keyed by chain (best-effort). */
  proteinSnippets: Record<string, string>;
  nucleicSnippets: Record<string, string>;
  /**
   * For sequence dock sync: closest nucleic residue to pick center among context.
   * `baseLetter` is 1-letter when inferable from coordinates alone.
   */
  nearestNucleic: {
    chainId: string;
    pdbResno: number;
    stripOrdinal: number;
    baseLetter?: string;
  } | null;
  /** Heavy protein–nucleic atom pairs within heuristic cutoffs (not validated H-bonds). */
  candidateHeavyContactCount: number;
  /** Subset: polar heavy (N,O) pairs &lt;= 3.5 Å — H-bond *candidates* only. */
  candidatePolarContactCount: number;
  /** Pairs where at least one heavy atom is phosphorus (candidate backbone contact). */
  candidatePhosphateContactCount: number;
  /** Short descriptions of closest candidate pairs for inspector. */
  candidatePairSummaries: string[];
  /** Residue-residue edges for chain-level graph (capped). */
  proximityGraphEdges: PolymerProximityGraphEdge[];
  /** Stable key for memoizing derived UI (structure title + selection fingerprint). */
  contextFingerprint: string;
}

export interface ViewportPickAnchor {
  x: number;
  y: number;
}

export interface ViewportPickDetail {
  chain: string;
  resno: number;
  resname: string;
  x?: number;
  y?: number;
  z?: number;
}

interface ViewerContextValue {
  proteinSelection: ProteinSelection | null;
  setProteinSelection: (s: ProteinSelection | null) => void;

  structureModel: StructureHierarchyModel | null;
  setStructureModel: React.Dispatch<React.SetStateAction<StructureHierarchyModel | null>>;

  representation: VizRepresentationId;
  setRepresentation: (r: VizRepresentationId) => void;

  colorScheme: VizColorSchemeId;
  setColorScheme: (c: VizColorSchemeId) => void;

  isolateChainId: string | null;
  setIsolateChainId: (id: string | null) => void;

  setChainVisibilityNGL: (chainId: string, visible: boolean) => void;

  spinEnabled: boolean;
  setSpinEnabled: (v: boolean) => void;

  renderOptions: ViewerRenderOptions;
  setRenderOptions: (p: Partial<ViewerRenderOptions>) => void;

  measurementMode: MeasurementMode;
  setMeasurementMode: (m: MeasurementMode) => void;

  focusResidueQuery: string;
  setFocusResidueQuery: (q: string) => void;

  selectedResidueKey: string | null;
  setSelectedResidueKey: (k: string | null) => void;

  /** When non-null, selectedResidueKey is CHAIN:stripOrdinal from sequence dock (not necessarily PDB resno). */
  selectedSequencePolymerKind: SequencePolymerKind | null;
  setSelectedResidueFromSequence: (key: string | null, kind: SequencePolymerKind | null) => void;

  /** Contact radius for contextual polymer expansion (viewport pick + sequence). */
  contextContactRadiusAngstrom: ContextContactRadiusAngstrom;
  setContextContactRadiusAngstrom: (r: ContextContactRadiusAngstrom) => void;

  polymerContextSnapshot: PolymerContextSnapshot | null;
  setPolymerContextSnapshot: (s: PolymerContextSnapshot | null) => void;

  /** Thin-line NGL distance overlay for cross-polymer contacts (heuristic). */
  polymerInteractionOverlayEnabled: boolean;
  setPolymerInteractionOverlayEnabled: (v: boolean) => void;

  /** Extra thin line emphasis on nucleic backbone (additive; reapplied after main repr). */
  nucleicBackboneAccentEnabled: boolean;
  setNucleicBackboneAccentEnabled: (v: boolean) => void;

  viewportPickDetail: ViewportPickDetail | null;
  /** Canvas-local pointer position for the latest viewport pick. */
  viewportPickAnchor: ViewportPickAnchor | null;
  setViewportPickAnchor: (a: ViewportPickAnchor | null) => void;
  /** Polymer type of the latest viewport pick (for sequence-strip sync). */
  viewportPickPolymerKind: SequencePolymerKind | null;
  setViewportPickDetail: (p: ViewportPickDetail | null) => void;
  /** Viewport click → sequence strip index + polymer kind (does not trigger sequence-origin camera). */
  applyViewportResiduePick: (detail: ViewportPickDetail, strip: StripSelectionFromPick | null) => void;

  nglQuality: NglQualityPreset;
  setNglQuality: (q: NglQualityPreset) => void;

  /** Highlight chain from hierarchy hover (sequence strip / HUD sync). */
  hoverChainId: string | null;
  setHoverChainId: (id: string | null) => void;

  viewportShellRef: React.MutableRefObject<HTMLDivElement | null>;
  setViewportShell: (el: HTMLDivElement | null) => void;

  stageRef: React.MutableRefObject<Stage | null>;
  structureComponentRef: React.MutableRefObject<StructureComponent | null>;
  registerStage: (s: Stage | null) => void;
  registerStructureComponent: (sc: StructureComponent | null) => void;

  requestReprRefresh: () => void;
  reprGeneration: number;

  runViewerCommand: (cmdId: string) => void;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);

const STORAGE_KEY = "biolabs.workspace.v1";

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [proteinSelection, setProteinSelection] = useState<ProteinSelection | null>(null);
  const [structureModel, setStructureModel] = useState<StructureHierarchyModel | null>(null);
  const [representation, setRepresentationState] = useState<VizRepresentationId>("cartoon");
  const [colorScheme, setColorSchemeState] = useState<VizColorSchemeId>("chainid");
  const [isolateChainId, setIsolateChainIdState] = useState<string | null>(null);
  const [spinEnabled, setSpinEnabledState] = useState(false);
  const [renderOptions, setRenderOptionsState] = useState<ViewerRenderOptions>({
    ambientOcclusion: false,
    shadows: false,
    transparency: false,
    edgeEnhancement: false,
    depthCue: true,
  });
  const [measurementMode, setMeasurementModeState] = useState<MeasurementMode>("none");
  const [focusResidueQuery, setFocusResidueQueryState] = useState("");
  const [selectedResidueKey, setSelectedResidueKeyState] = useState<string | null>(null);
  const [selectedSequencePolymerKind, setSelectedSequencePolymerKindState] =
    useState<SequencePolymerKind | null>(null);
  const [hoverChainId, setHoverChainIdState] = useState<string | null>(null);
  const [reprGeneration, setReprGeneration] = useState(0);
  const [viewportPickDetail, setViewportPickDetailState] = useState<ViewportPickDetail | null>(null);
  const [viewportPickAnchor, setViewportPickAnchorState] = useState<ViewportPickAnchor | null>(null);
  const [viewportPickPolymerKind, setViewportPickPolymerKindState] =
    useState<SequencePolymerKind | null>(null);
  const [nglQuality, setNglQualityState] = useState<NglQualityPreset>("medium");
  const [contextContactRadiusAngstrom, setContextContactRadiusAngstromState] =
    useState<ContextContactRadiusAngstrom>(6);
  const [polymerContextSnapshot, setPolymerContextSnapshotState] = useState<PolymerContextSnapshot | null>(null);
  const [polymerInteractionOverlayEnabled, setPolymerInteractionOverlayEnabledState] = useState(true);
  const [nucleicBackboneAccentEnabled, setNucleicBackboneAccentEnabledState] = useState(false);

  const stageRef = useRef<Stage | null>(null);
  const structureComponentRef = useRef<StructureComponent | null>(null);
  const viewportShellRef = useRef<HTMLDivElement | null>(null);
  const colorBeforeConfidenceRef = useRef<VizColorSchemeId | null>(null);
  const structureModelRef = useRef(structureModel);
  const viewportPickDetailRef = useRef(viewportPickDetail);
  const selectedResidueKeyRef = useRef(selectedResidueKey);
  const polymerContextSnapshotRef = useRef(polymerContextSnapshot);
  structureModelRef.current = structureModel;
  viewportPickDetailRef.current = viewportPickDetail;
  selectedResidueKeyRef.current = selectedResidueKey;
  polymerContextSnapshotRef.current = polymerContextSnapshot;

  const toastPolymerOverlay = useCallback((kind: PolymerOverlayToastKind, enabling: boolean) => {
    const model = structureModelRef.current;
    const hasPick = hasActivePolymerPick(
      viewportPickDetailRef.current,
      selectedResidueKeyRef.current,
    );
    const snapshot = polymerContextSnapshotRef.current;
    const toastKey = resolvePolymerOverlayToastKey(kind, enabling, model, hasPick, snapshot);
    const titleKey = kind === "ixn" ? "toastTitles.contextContacts" : "toastTitles.nucleicAccent";
    const toastParams =
      toastKey === "toasts.overlayLinesOn"
        ? { count: snapshot?.candidateHeavyContactCount ?? 0 }
        : toastKey === "toasts.nucleicAccentOnDetail"
          ? { count: snapshot?.nucleicResidueCount ?? 0 }
          : undefined;
    toast.message(i18n.t(titleKey, { ns: "viewport" }), {
      description: i18n.t(toastKey, { ns: "viewport", ...toastParams }),
    });
  }, []);

  const registerStage = useCallback((s: Stage | null) => {
    stageRef.current = s;
  }, []);

  const registerStructureComponent = useCallback((sc: StructureComponent | null) => {
    structureComponentRef.current = sc;
  }, []);

  const setViewportShell = useCallback((el: HTMLDivElement | null) => {
    viewportShellRef.current = el;
  }, []);

  const setContextContactRadiusAngstrom = useCallback((r: ContextContactRadiusAngstrom) => {
    setContextContactRadiusAngstromState(r);
  }, []);

  const setPolymerContextSnapshot = useCallback((s: PolymerContextSnapshot | null) => {
    setPolymerContextSnapshotState(s);
  }, []);

  const setPolymerInteractionOverlayEnabled = useCallback((v: boolean) => {
    setPolymerInteractionOverlayEnabledState(v);
  }, []);

  const setNucleicBackboneAccentEnabled = useCallback((v: boolean) => {
    setNucleicBackboneAccentEnabledState(v);
  }, []);

  const setHoverChainId = useCallback((id: string | null) => {
    setHoverChainIdState(id);
  }, []);

  const setViewportPickAnchor = useCallback((a: ViewportPickAnchor | null) => {
    setViewportPickAnchorState(a);
  }, []);

  const setViewportPickDetail = useCallback((p: ViewportPickDetail | null) => {
    setViewportPickDetailState(p);
    setViewportPickPolymerKindState(null);
    if (!p) setViewportPickAnchorState(null);
  }, []);

  const applyViewportResiduePick = useCallback(
    (detail: ViewportPickDetail, strip: StripSelectionFromPick | null) => {
      setViewportPickDetailState(detail);
      setSelectedSequencePolymerKindState(null);
      if (strip) {
        setViewportPickPolymerKindState(strip.polymerKind);
        setSelectedResidueKeyState(`${strip.chainId}:${strip.stripOrdinal}`);
      } else {
        setViewportPickPolymerKindState(null);
        setSelectedResidueKeyState(`${detail.chain}:${detail.resno}`);
      }
    },
    [],
  );

  const setNglQuality = useCallback((q: NglQualityPreset) => {
    setNglQualityState(q);
  }, []);

  const requestReprRefresh = useCallback(() => {
    setReprGeneration((g) => g + 1);
  }, []);

  const setRepresentation = useCallback(
    (r: VizRepresentationId) => {
      setRepresentationState(r);
      requestReprRefresh();
    },
    [requestReprRefresh],
  );

  const setColorScheme = useCallback(
    (c: VizColorSchemeId) => {
      setColorSchemeState(c);
      requestReprRefresh();
    },
    [requestReprRefresh],
  );

  const setIsolateChainId = useCallback(
    (id: string | null) => {
      setIsolateChainIdState(id);
      requestReprRefresh();
    },
    [requestReprRefresh],
  );

  const setChainVisibilityNGL = useCallback(
    (chainId: string, visible: boolean) => {
      setStructureModel((prev) => {
        if (!prev) return prev;
        const chains = prev.chains.map((c) => (c.id === chainId ? { ...c, visible } : c));
        const sc = structureComponentRef.current;
        if (sc) {
          const show = chains.filter((c) => c.visible);
          try {
            if (show.length === 0 || show.length === chains.length) {
              sc.setSelection("");
            } else {
              sc.setSelection(show.map((c) => `:${c.id}`).join(" or "));
            }
          } catch {
            toast.message(i18n.t("toastTitles.visibility", { ns: "viewport" }), {
              description: i18n.t("toasts.visibilitySkipped", { ns: "viewport" }),
            });
          }
        }
        requestReprRefresh();
        return { ...prev, chains };
      });
    },
    [requestReprRefresh],
  );

  const setSpinEnabled = useCallback((v: boolean) => {
    setSpinEnabledState(v);
    const st = stageRef.current;
    if (!st) return;
    try {
      st.setSpin(v);
    } catch {
      /* ignore */
    }
  }, []);

  const setRenderOptions = useCallback((p: Partial<ViewerRenderOptions>) => {
    setRenderOptionsState((o) => ({ ...o, ...p }));
  }, []);

  const setMeasurementMode = useCallback((m: MeasurementMode) => {
    clearViewportMeasurements(structureComponentRef.current);
    setMeasurementModeState(m);
    if (m !== "none") {
      toast.message(i18n.t("toastTitles.measurement", { ns: "viewport" }), {
        description: i18n.t(`toasts.measurementActive.${m}`, { ns: "viewport" }),
      });
    }
  }, []);

  /** New structure — clear isolate, pick, and residue selection so nothing stale leaks across loads. */
  React.useEffect(() => {
    setIsolateChainIdState(null);
    setViewportPickDetailState(null);
    setViewportPickPolymerKindState(null);
    setSelectedResidueKeyState(null);
    setSelectedSequencePolymerKindState(null);
    setPolymerContextSnapshotState(null);
    setPolymerInteractionOverlayEnabledState(true);
    setNucleicBackboneAccentEnabledState(false);
  }, [proteinSelection ? proteinSelectionKey(proteinSelection) : null]);

  const setFocusResidueQuery = useCallback((q: string) => {
    setFocusResidueQueryState(q);
  }, []);

  const setSelectedResidueKey = useCallback((k: string | null) => {
    setSelectedResidueKeyState(k);
    setSelectedSequencePolymerKindState(null);
    if (k === null) {
      setPolymerContextSnapshotState(null);
    }
  }, []);

  const setSelectedResidueFromSequence = useCallback((key: string | null, kind: SequencePolymerKind | null) => {
    setSelectedResidueKeyState(key);
    setSelectedSequencePolymerKindState(kind);
    if (key) {
      setViewportPickDetailState(null);
      setViewportPickPolymerKindState(null);
    }
  }, []);

  const runViewerCommand = useCallback(
    (cmdId: string) => {
      const sc = structureComponentRef.current;
      const st = stageRef.current;
      switch (cmdId) {
        case "repr.cartoon":
          setRepresentation("cartoon");
          break;
        case "repr.surface":
          setRepresentation("surface");
          break;
        case "repr.ballstick":
          setRepresentation("ball+stick");
          break;
        case "repr.rope":
          setRepresentation("rope");
          break;
        case "repr.ribbon":
          setRepresentation("ribbon");
          break;
        case "repr.line":
          setRepresentation("line");
          break;
        case "repr.wireframe":
          setRepresentation("wireframe");
          break;
        case "repr.spacefill":
          setRepresentation("spacefill");
          break;
        case "isolate.B":
          setIsolateChainId("B");
          break;
        case "isolate.A":
          setIsolateChainId("A");
          break;
        case "isolate.clear":
          setIsolateChainId(null);
          break;
        case "color.chainid":
          setColorScheme("chainid");
          break;
        case "color.residueindex":
          setColorScheme("residueindex");
          break;
        case "color.hydrophobicity":
          setColorScheme("hydrophobicity");
          break;
        case "color.bfactor":
          setColorScheme("bfactor");
          break;
        case "color.bfactor.gray":
          setColorScheme("bfactor_gray");
          break;
        case "color.electrostatic":
          setColorScheme("electrostatic");
          break;
        case "overlay.confidence.toggle": {
          setColorSchemeState((prev) => {
            const isConf = prev === "bfactor" || prev === "bfactor_gray";
            if (isConf) {
              const next = colorBeforeConfidenceRef.current ?? "chainid";
              colorBeforeConfidenceRef.current = null;
              return next;
            }
            colorBeforeConfidenceRef.current = prev;
            return "bfactor_gray";
          });
          requestReprRefresh();
          break;
        }
        case "view.spin.toggle":
          setSpinEnabledState((s) => {
            const n = !s;
            try {
              stageRef.current?.setSpin(n);
            } catch {
              /* */
            }
            return n;
          });
          break;
        case "view.center":
        case "view.fit.structure":
          nglFitStructure(st, sc);
          break;
        case "view.reset":
          nglResetView(st);
          break;
        case "view.fit.selection":
          nglFitSelection(st, sc, isolateChainId, selectedResidueKey);
          break;
        case "view.preset.readable":
          setIsolateChainId(null);
          setRepresentation("cartoon");
          setColorScheme("chainid");
          break;
        case "view.quality.toggle":
          setNglQualityState((q) => {
            const order: NglQualityPreset[] = ["low", "medium", "high"];
            const next = order[(order.indexOf(q) + 1) % order.length];
            try {
              stageRef.current?.setQuality(next);
            } catch {
              /* */
            }
            toast.message(i18n.t("toastTitles.quality", { ns: "viewport" }), {
              description: i18n.t("toasts.qualityChanged", {
                ns: "viewport",
                quality: i18n.t(`toolbar.qualityLevels.${next}`, { ns: "viewport" }),
              }),
            });
            return next;
          });
          requestReprRefresh();
          break;
        case "view.fullscreen.toggle": {
          const el = viewportShellRef.current;
          if (!el) {
            toast.message(i18n.t("toastTitles.viewport", { ns: "viewport" }), {
              description: i18n.t("toasts.fullscreenNotMounted", { ns: "viewport" }),
            });
            break;
          }
          void (async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await el.requestFullscreen();
            } catch {
              toast.message(i18n.t("toastTitles.fullscreen", { ns: "viewport" }), {
                description: i18n.t("toasts.fullscreenBlocked", { ns: "viewport" }),
              });
            }
          })();
          break;
        }
        case "render.ao.toggle":
          setRenderOptionsState((o) => {
            const ambientOcclusion = !o.ambientOcclusion;
            toast.message(i18n.t("toastTitles.ambientOcclusion", { ns: "viewport" }), {
              description: ambientOcclusion
                ? i18n.t("toasts.aoOn", { ns: "viewport" })
                : i18n.t("toasts.aoOff", { ns: "viewport" }),
            });
            return { ...o, ambientOcclusion };
          });
          break;
        case "export.cif":
          void (async () => {
            try {
              const sel = proteinSelection;
              if (!sel) {
                toast.message(i18n.t("toastTitles.export", { ns: "viewport" }), {
                  description: i18n.t("toasts.exportNoStructure", { ns: "viewport" }),
                });
                return;
              }
              await downloadStructureCoordinates(sel);
              toast.success(i18n.t("toasts.exportStarted", { ns: "viewport" }));
            } catch (e) {
              toast.error(e instanceof Error ? e.message : i18n.t("toasts.exportFailed", { ns: "viewport" }));
            }
          })();
          break;
        case "screenshot": {
          void nglScreenshotToFile(st).then((ok) => {
            if (ok) toast.success(i18n.t("toasts.screenshotOk", { ns: "viewport" }));
            else toast.error(i18n.t("toasts.screenshotFailed", { ns: "viewport" }));
          });
          break;
        }
        case "analysis.interactions":
          setPolymerInteractionOverlayEnabledState((o) => {
            const n = !o;
            toastPolymerOverlay("ixn", n);
            return n;
          });
          break;
        case "view.preset.nucleic.accent":
          setNucleicBackboneAccentEnabledState((a) => {
            const n = !a;
            toastPolymerOverlay("nucleic", n);
            return n;
          });
          break;
        default:
          break;
      }
      if (cmdId.startsWith("focus.residue.") && sc) {
        const num = cmdId.split(".").pop();
        if (num) {
          try {
            sc.autoView(num, 0);
          } catch {
            /* */
          }
        }
      }
      if (cmdId.startsWith("isolate.chain.")) {
        const id = cmdId.slice("isolate.chain.".length).trim();
        if (id) setIsolateChainId(id === "clear" ? null : id);
      }
    },
    [
      setRepresentation,
      setIsolateChainId,
      setColorScheme,
      isolateChainId,
      selectedResidueKey,
      proteinSelection,
      requestReprRefresh,
      toastPolymerOverlay,
    ],
  );

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        proteinSelection?: ProteinSelection;
        representation?: VizRepresentationId;
        colorScheme?: VizColorSchemeId;
      };
      if (data.proteinSelection && data.proteinSelection.source !== "file") {
        setProteinSelection(data.proteinSelection);
      }
      if (data.representation) setRepresentationState(data.representation);
      if (data.colorScheme) setColorSchemeState(data.colorScheme);
    } catch {
      /* ignore */
    }
  }, []);

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            proteinSelection: proteinSelection?.source === "file" ? undefined : proteinSelection,
            representation,
            colorScheme,
          }),
        );
      } catch {
        /* ignore */
      }
    }, 500);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [proteinSelection, representation, colorScheme]);

  const value = useMemo<ViewerContextValue>(
    () => ({
      proteinSelection,
      setProteinSelection,
      structureModel,
      setStructureModel,
      representation,
      setRepresentation,
      colorScheme,
      setColorScheme,
      isolateChainId,
      setIsolateChainId,
      setChainVisibilityNGL,
      spinEnabled,
      setSpinEnabled,
      renderOptions,
      setRenderOptions,
      measurementMode,
      setMeasurementMode,
      focusResidueQuery,
      setFocusResidueQuery,
      selectedResidueKey,
      setSelectedResidueKey,
      selectedSequencePolymerKind,
      setSelectedResidueFromSequence,
      viewportPickDetail,
      viewportPickAnchor,
      setViewportPickAnchor,
      viewportPickPolymerKind,
      setViewportPickDetail,
      applyViewportResiduePick,
      contextContactRadiusAngstrom,
      setContextContactRadiusAngstrom,
      polymerContextSnapshot,
      setPolymerContextSnapshot,
      polymerInteractionOverlayEnabled,
      setPolymerInteractionOverlayEnabled,
      nucleicBackboneAccentEnabled,
      setNucleicBackboneAccentEnabled,
      nglQuality,
      setNglQuality,
      hoverChainId,
      setHoverChainId,
      viewportShellRef,
      setViewportShell,
      stageRef,
      structureComponentRef,
      registerStage,
      registerStructureComponent,
      requestReprRefresh,
      reprGeneration,
      runViewerCommand,
    }),
    [
      proteinSelection,
      structureModel,
      representation,
      colorScheme,
      isolateChainId,
      spinEnabled,
      renderOptions,
      measurementMode,
      focusResidueQuery,
      selectedResidueKey,
      selectedSequencePolymerKind,
      viewportPickDetail,
      viewportPickAnchor,
      contextContactRadiusAngstrom,
      polymerContextSnapshot,
      polymerInteractionOverlayEnabled,
      nucleicBackboneAccentEnabled,
      nglQuality,
      hoverChainId,
      registerStage,
      registerStructureComponent,
      requestReprRefresh,
      reprGeneration,
      setRepresentation,
      setColorScheme,
      setIsolateChainId,
      setChainVisibilityNGL,
      setSpinEnabled,
      setRenderOptions,
      setMeasurementMode,
      setFocusResidueQuery,
      setSelectedResidueKey,
      setSelectedResidueFromSequence,
      setViewportPickDetail,
      setViewportPickAnchor,
      applyViewportResiduePick,
      setContextContactRadiusAngstrom,
      setPolymerContextSnapshot,
      setPolymerInteractionOverlayEnabled,
      setNucleicBackboneAccentEnabled,
      setNglQuality,
      setHoverChainId,
      setViewportShell,
      runViewerCommand,
    ],
  );

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer(): ViewerContextValue {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used within ViewerProvider");
  return ctx;
}

export function useViewerOptional(): ViewerContextValue | null {
  return useContext(ViewerContext);
}
