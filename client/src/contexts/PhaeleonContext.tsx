import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { analyzeDrugInteraction, normalizeDrugKey } from "@/lib/phaeleon/interactionRules";
import { notifyPhaeleonAiUnavailable } from "@/lib/phaeleon/phaeleonAiNotices";
import { fetchDrugProfile, searchFdaDrugs } from "@/lib/phaeleon/fdaDrugApi";
import { buildLocalOnlyDrugProfile } from "@/lib/phaeleon/drugProfile";
import { mergeDrugSearchHits, searchLocalDrugMapping } from "@/lib/phaeleon/localDrugSearch";
import { sanitizeDrugInput } from "@/lib/phaeleon/drugSearch";
import { loadPhaeleonActiveSession } from "@/lib/phaeleon/phaeleonActiveSessionStorage";
import { loadPhaeleonSearchHistory, pushPhaeleonSearchHistory } from "@/lib/phaeleon/phaeleonSearchHistory";
import { clearPhaeleonScopedSessionData } from "@/lib/phaeleon/phaeleonSessionReset";
import {
  applyPhaeleonLayoutPreset,
  type PhaeleonLayoutPresetId,
} from "@/lib/phaeleon/phaeleonLayoutPresets";
import { getOrCreateAppSessionId } from "@/lib/session/cookieSession";
import {
  DEFAULT_PHAELEON_CLIENT_SETTINGS,
  loadPhaeleonClientSettings,
  resetPhaeleonClientSettings,
  savePhaeleonClientSettings,
  type PhaeleonClientSettings,
} from "@/lib/phaeleon/phaeleonSettingsStorage";
import { needsInteractionResearch } from "@/lib/phaeleon/phaeleonProfileGaps";
import { fetchInteractionResearch, type PhaeleonInteractionResearch } from "@/lib/phaeleon/phaeleonResearchApi";
import {
  mergeTranslatedAnalysis,
  readCachedAnalysisTranslation,
  translateInteractionAnalysis,
} from "@/lib/phaeleon/translateInteractionAnalysis";
import type { DrugProfile, DrugSearchHit, DrugSlot, InteractionAnalysis } from "@/lib/phaeleon/types";
import type { SupportedUiLocale } from "@shared/i18n/locales";

type PhaeleonAgentStateSnapshot = {
  activeSlot: HelixDrugSlot;
  drug1: DrugSlot | null;
  drug2: DrugSlot | null;
  searchQuery: string;
  searchHits: DrugSearchHit[];
  searchLoading: boolean;
  canAnalyze: boolean;
};

export type HelixDrugSlot = "drug1" | "drug2";

export const PHAELEON_SEARCH_FOCUS_EVENT = "biolabs:phaeleon-search-focus";

interface PhaeleonContextValue {
  settings: PhaeleonClientSettings;
  updateSettings: (patch: Partial<PhaeleonClientSettings>) => void;
  setLayoutPreset: (presetId: Exclude<PhaeleonLayoutPresetId, "custom">) => void;
  resetLayoutToPreset: () => void;
  resetSettings: () => void;
  clearSession: () => void;
  swapDrugs: () => void;
  activeSlot: HelixDrugSlot;
  setActiveSlot: (slot: HelixDrugSlot) => void;
  drug1: DrugSlot | null;
  drug2: DrugSlot | null;
  selectDrug: (hit: DrugSearchHit) => void;
  assignDrugToSlot: (hit: DrugSearchHit, slot: HelixDrugSlot) => void;
  getAgentSnapshot: () => PhaeleonAgentStateSnapshot;
  requestDrugAssign: (hit: DrugSearchHit) => void;
  pendingDrugAssign: { hit: DrugSearchHit; slot: HelixDrugSlot } | null;
  confirmDrugAssign: () => void;
  cancelDrugAssign: () => void;
  clearDrug: (slot: HelixDrugSlot) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchHits: DrugSearchHit[];
  localSearchHits: DrugSearchHit[];
  recentSearches: string[];
  searchLoading: boolean;
  searchError: string | null;
  runSearch: (query?: string) => Promise<void>;
  analysis: InteractionAnalysis | null;
  displayAnalysis: InteractionAnalysis | null;
  analysisTranslationLoading: boolean;
  analysisTranslationReveal: boolean;
  analysisTranslationFailed: boolean;
  analysisLoading: boolean;
  runAnalysis: () => Promise<void>;
  canAnalyze: boolean;
  inspectorSlot: HelixDrugSlot | null;
  setInspectorSlot: (slot: HelixDrugSlot | null) => void;
  drugProfile: DrugProfile | null;
  drugProfileLoading: boolean;
  drug1Profile: DrugProfile | null;
  drug2Profile: DrugProfile | null;
  interactionResearch: PhaeleonInteractionResearch | null;
  interactionResearchLoading: boolean;
  /** When true, assistant chat includes the active drug-pair context badge and AI annotations. */
  assistantPairContextPinned: boolean;
  dismissAssistantPairContext: () => void;
}

const PhaeleonContext = createContext<PhaeleonContextValue | null>(null);

function hitToSlot(hit: DrugSearchHit): DrugSlot {
  return {
    name: hit.name,
    genericNames: hit.genericNames,
    brandNames: hit.brandNames,
  };
}

export function PhaeleonProvider({ children }: { children: React.ReactNode }) {
  const { resolvedLocale } = useLocale();
  const [settings, setSettings] = useState<PhaeleonClientSettings>(() => loadPhaeleonClientSettings());
  const [activeSlot, setActiveSlot] = useState<HelixDrugSlot>("drug1");
  const [drug1, setDrug1] = useState<DrugSlot | null>(null);
  const [drug2, setDrug2] = useState<DrugSlot | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<DrugSearchHit[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadPhaeleonSearchHistory());
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pendingDrugAssign, setPendingDrugAssign] = useState<{ hit: DrugSearchHit; slot: HelixDrugSlot } | null>(
    null,
  );
  const [analysis, setAnalysis] = useState<InteractionAnalysis | null>(null);
  const [displayAnalysis, setDisplayAnalysis] = useState<InteractionAnalysis | null>(null);
  const [analysisTranslationLoading, setAnalysisTranslationLoading] = useState(false);
  const [analysisTranslationReveal, setAnalysisTranslationReveal] = useState(false);
  const [analysisTranslationFailed, setAnalysisTranslationFailed] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [inspectorSlot, setInspectorSlot] = useState<HelixDrugSlot | null>("drug1");
  const [drug1Profile, setDrug1Profile] = useState<DrugProfile | null>(null);
  const [drug2Profile, setDrug2Profile] = useState<DrugProfile | null>(null);
  const [drug1ProfileLoading, setDrug1ProfileLoading] = useState(false);
  const [drug2ProfileLoading, setDrug2ProfileLoading] = useState(false);
  const [interactionResearch, setInteractionResearch] = useState<PhaeleonInteractionResearch | null>(null);
  const [interactionResearchLoading, setInteractionResearchLoading] = useState(false);
  const [assistantPairContextPinned, setAssistantPairContextPinned] = useState(true);
  const pairContextKey = `${drug1?.name ?? ""}|${drug2?.name ?? ""}`;
  const drug1ProfileRequestRef = useRef(0);
  const drug2ProfileRequestRef = useRef(0);
  const presentAnalysisRequestRef = useRef(0);
  const resolvedLocaleRef = useRef(resolvedLocale);
  const drug1Ref = useRef<DrugSlot | null>(null);
  const drug2Ref = useRef<DrugSlot | null>(null);
  const analysisRef = useRef<InteractionAnalysis | null>(null);
  const searchQueryRef = useRef("");
  const agentStateRef = useRef<PhaeleonAgentStateSnapshot>({
    activeSlot: "drug1",
    drug1: null,
    drug2: null,
    searchQuery: "",
    searchHits: [],
    searchLoading: false,
    canAnalyze: false,
  });

  drug1Ref.current = drug1;
  drug2Ref.current = drug2;
  analysisRef.current = analysis;
  searchQueryRef.current = searchQuery;
  agentStateRef.current = {
    activeSlot,
    drug1,
    drug2,
    searchQuery,
    searchHits,
    searchLoading,
    canAnalyze: Boolean(drug1 && drug2),
  };

  const presentAnalysisForLocale = useCallback(async (target: InteractionAnalysis, locale: SupportedUiLocale) => {
    const requestId = ++presentAnalysisRequestRef.current;

    if (locale === "en") {
      if (requestId !== presentAnalysisRequestRef.current) return;
      setDisplayAnalysis(target);
      setAnalysisTranslationLoading(false);
      setAnalysisTranslationReveal(false);
      setAnalysisTranslationFailed(false);
      return;
    }

    const cached = readCachedAnalysisTranslation(target, locale);
    if (cached) {
      if (requestId !== presentAnalysisRequestRef.current) return;
      setDisplayAnalysis(mergeTranslatedAnalysis(target, cached));
      setAnalysisTranslationLoading(false);
      setAnalysisTranslationReveal(true);
      setAnalysisTranslationFailed(false);
      return;
    }

    setDisplayAnalysis(null);
    setAnalysisTranslationLoading(true);
    setAnalysisTranslationReveal(false);
    setAnalysisTranslationFailed(false);

    try {
      const translated = await translateInteractionAnalysis(target, locale);
      if (requestId !== presentAnalysisRequestRef.current) return;
      setDisplayAnalysis(translated);
      setAnalysisTranslationLoading(false);
      setAnalysisTranslationReveal(true);
      setAnalysisTranslationFailed(false);
    } catch {
      if (requestId !== presentAnalysisRequestRef.current) return;
      setDisplayAnalysis(null);
      setAnalysisTranslationLoading(false);
      setAnalysisTranslationReveal(false);
      setAnalysisTranslationFailed(true);
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<PhaeleonClientSettings>) => {
    setSettings((prev) => {
      const layoutTouched =
        patch.inputColumnWidth !== undefined ||
        patch.rightColumnWidth !== undefined ||
        patch.stackSecondaryHeight !== undefined ||
        patch.layoutStructure !== undefined ||
        patch.assistantPanelOpen !== undefined;
      const next: PhaeleonClientSettings = {
        ...prev,
        ...patch,
        ...(layoutTouched && patch.layoutPreset === undefined ? { layoutPreset: "custom" as const } : null),
      };
      savePhaeleonClientSettings(next);
      return next;
    });
  }, []);

  const setLayoutPreset = useCallback(
    (presetId: Exclude<PhaeleonLayoutPresetId, "custom">) => {
      updateSettings(applyPhaeleonLayoutPreset(presetId));
    },
    [updateSettings],
  );

  const resetLayoutToPreset = useCallback(() => {
    setSettings((prev) => {
      const presetId = prev.layoutPreset === "custom" ? "binary" : prev.layoutPreset;
      const next: PhaeleonClientSettings = {
        ...prev,
        ...applyPhaeleonLayoutPreset(presetId),
      };
      savePhaeleonClientSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const next = resetPhaeleonClientSettings();
    setSettings(next);
    savePhaeleonClientSettings(next);
  }, []);

  const dismissAssistantPairContext = useCallback(() => {
    setAssistantPairContextPinned(false);
  }, []);

  useEffect(() => {
    setAssistantPairContextPinned(true);
  }, [pairContextKey]);

  useEffect(() => {
    getOrCreateAppSessionId();
    const saved = loadPhaeleonActiveSession();
    if (!saved) return;
    if (saved.drug1) {
      setDrug1(saved.drug1);
      drug1Ref.current = saved.drug1;
    }
    if (saved.drug2) {
      setDrug2(saved.drug2);
      drug2Ref.current = saved.drug2;
    }
    if (saved.assistantPairContextPinned === false) {
      setAssistantPairContextPinned(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    clearPhaeleonScopedSessionData();
    setAssistantPairContextPinned(true);
    setDrug1(null);
    setDrug2(null);
    setSearchQuery("");
    setSearchHits([]);
    setSearchError(null);
    setAnalysis(null);
    setDisplayAnalysis(null);
    setAnalysisTranslationLoading(false);
    setAnalysisTranslationReveal(false);
    setAnalysisTranslationFailed(false);
    setActiveSlot("drug1");
    setInspectorSlot("drug1");
    setDrug1Profile(null);
    setDrug2Profile(null);
    setInteractionResearch(null);
  }, []);

  const swapDrugs = useCallback(() => {
    const nextA = drug2;
    const nextB = drug1;
    setDrug1(nextA);
    setDrug2(nextB);
    setAnalysis(null);
    setDisplayAnalysis(null);
    setAnalysisTranslationLoading(false);
    setAnalysisTranslationReveal(false);
    setAnalysisTranslationFailed(false);
  }, [drug1, drug2]);

  const localSearchHits = useMemo(() => {
    const q = sanitizeDrugInput(searchQuery);
    return q ? searchLocalDrugMapping(q) : [];
  }, [searchQuery]);

  const fetchRemoteSearch = useCallback(
    async (rawQuery: string, local: DrugSearchHit[]) => {
      setSearchLoading(true);
      agentStateRef.current.searchLoading = true;
      setSearchError(null);
      try {
        const res = await searchFdaDrugs(rawQuery, { fuzzy: settings.fuzzySearchEnabled });
        const merged = mergeDrugSearchHits(local, res.hits);
        setSearchHits(merged);
        agentStateRef.current.searchHits = merged;
        if (merged.length === 0) setSearchError("noResults");
      } catch (err) {
        setSearchHits(local);
        agentStateRef.current.searchHits = local;
        if (local.length === 0) {
          setSearchError(err instanceof Error ? err.message : "searchFailed");
        }
      } finally {
        setSearchLoading(false);
        agentStateRef.current.searchLoading = false;
      }
    },
    [settings.fuzzySearchEnabled],
  );

  const runSearch = useCallback(async (queryOverride?: string) => {
    const q = sanitizeDrugInput(queryOverride ?? searchQueryRef.current);
    if (!q) {
      setSearchHits([]);
      setSearchError(null);
      agentStateRef.current.searchHits = [];
      agentStateRef.current.searchQuery = "";
      return;
    }
    agentStateRef.current.searchQuery = q;
    const local = searchLocalDrugMapping(q);
    setSearchHits(local);
    agentStateRef.current.searchHits = local;
    await fetchRemoteSearch(q, local);
  }, [fetchRemoteSearch]);

  useEffect(() => {
    const q = sanitizeDrugInput(searchQuery);
    if (!q) {
      setSearchHits([]);
      setSearchError(null);
      return;
    }
    const local = searchLocalDrugMapping(q);
    setSearchHits(local);
    setSearchError(null);
    const timer = window.setTimeout(() => {
      void fetchRemoteSearch(q, local);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchQuery, settings.fuzzySearchEnabled, fetchRemoteSearch]);

  const assignDrugToSlot = useCallback((hit: DrugSearchHit, slot: HelixDrugSlot) => {
    const next = hitToSlot(hit);
    if (slot === "drug1") {
      setDrug1(next);
      agentStateRef.current.drug1 = next;
      setSearchQuery("");
      setSearchHits([]);
      setSearchError(null);
    } else {
      setDrug2(next);
      agentStateRef.current.drug2 = next;
    }
    agentStateRef.current.activeSlot = slot;
    agentStateRef.current.canAnalyze = Boolean(agentStateRef.current.drug1 && agentStateRef.current.drug2);
    setInspectorSlot(slot);
    setAnalysis(null);
    setDisplayAnalysis(null);
    setAnalysisTranslationLoading(false);
    setAnalysisTranslationReveal(false);
    setAnalysisTranslationFailed(false);
    setPendingDrugAssign(null);
    let nextActive: HelixDrugSlot = slot;
    if (slot === "drug1" && !agentStateRef.current.drug2) nextActive = "drug2";
    else if (slot === "drug2" && !agentStateRef.current.drug1) nextActive = "drug1";
    agentStateRef.current.activeSlot = nextActive;
    setActiveSlot(nextActive);
  }, []);

  const selectDrug = useCallback(
    (hit: DrugSearchHit) => {
      assignDrugToSlot(hit, activeSlot);
    },
    [activeSlot, assignDrugToSlot],
  );

  const requestDrugAssign = useCallback(
    (hit: DrugSearchHit) => {
      setPendingDrugAssign({ hit, slot: activeSlot });
    },
    [activeSlot],
  );

  const confirmDrugAssign = useCallback(() => {
    if (!pendingDrugAssign) return;
    const q = sanitizeDrugInput(searchQuery);
    if (q) setRecentSearches(pushPhaeleonSearchHistory(q));
    assignDrugToSlot(pendingDrugAssign.hit, pendingDrugAssign.slot);
  }, [pendingDrugAssign, searchQuery, assignDrugToSlot]);

  const cancelDrugAssign = useCallback(() => {
    setPendingDrugAssign(null);
  }, []);

  const loadSlotProfile = useCallback(
    (
      name: string,
      setProfile: (profile: DrugProfile) => void,
      setLoading: (loading: boolean) => void,
      requestId: number,
      requestRef: React.MutableRefObject<number>,
    ) => {
      setLoading(true);
      setProfile(buildLocalOnlyDrugProfile(name));
      void fetchDrugProfile(name)
        .then((profile) => {
          if (requestRef.current !== requestId) return;
          setProfile(profile);
        })
        .catch(() => {
          if (requestRef.current !== requestId) return;
          setProfile(buildLocalOnlyDrugProfile(name));
        })
        .finally(() => {
          if (requestRef.current !== requestId) return;
          setLoading(false);
        });
    },
    [],
  );

  useEffect(() => {
    if (!drug1) {
      setDrug1Profile(null);
      setDrug1ProfileLoading(false);
      return;
    }
    const requestId = ++drug1ProfileRequestRef.current;
    loadSlotProfile(drug1.name, setDrug1Profile, setDrug1ProfileLoading, requestId, drug1ProfileRequestRef);
  }, [drug1?.name, loadSlotProfile]);

  useEffect(() => {
    if (!drug2) {
      setDrug2Profile(null);
      setDrug2ProfileLoading(false);
      return;
    }
    const requestId = ++drug2ProfileRequestRef.current;
    loadSlotProfile(drug2.name, setDrug2Profile, setDrug2ProfileLoading, requestId, drug2ProfileRequestRef);
  }, [drug2?.name, loadSlotProfile]);

  const clearDrug = useCallback((slot: HelixDrugSlot) => {
    if (slot === "drug1") setDrug1(null);
    else setDrug2(null);
    setAnalysis(null);
    setDisplayAnalysis(null);
    setAnalysisTranslationLoading(false);
    setAnalysisTranslationReveal(false);
    setAnalysisTranslationFailed(false);
    setInspectorSlot((current) => {
      if (current !== slot) return current;
      return slot === "drug1" ? "drug2" : "drug1";
    });
  }, []);

  const focusedDrug = inspectorSlot === "drug2" ? drug2 : drug1;
  const drugProfile = focusedDrug ? (inspectorSlot === "drug2" ? drug2Profile : drug1Profile) : null;
  const drugProfileLoading = inspectorSlot === "drug2" ? drug2ProfileLoading : drug1ProfileLoading;

  useEffect(() => {
    if (!drug1 || !drug2) {
      setInteractionResearch(null);
      setInteractionResearchLoading(false);
      return;
    }
    if (!needsInteractionResearch(drug1Profile, drug2Profile, analysis)) {
      setInteractionResearch(null);
      setInteractionResearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setInteractionResearchLoading(true);
    void fetchInteractionResearch(drug1.name, drug2.name, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setInteractionResearch(result);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setInteractionResearch(null);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setInteractionResearchLoading(false);
      });

    return () => controller.abort();
  }, [drug1, drug2, drug1Profile, drug2Profile, analysis, settings]);

  const canAnalyze = Boolean(drug1 && drug2);

  const applyRuleBasedAnalysis = useCallback((drugA: DrugSlot, drugB: DrugSlot) => {
    const base = analyzeDrugInteraction(drugA.name, drugB.name);
    setAnalysis(base);
    setDisplayAnalysis(base);
    setAnalysisTranslationReveal(false);
    setAnalysisTranslationFailed(false);
    analysisRef.current = base;
  }, []);

  const analysisMatchesPair = useCallback((target: InteractionAnalysis | null, drugA: DrugSlot, drugB: DrugSlot) => {
    if (!target) return false;
    return (
      normalizeDrugKey(target.drug1) === normalizeDrugKey(drugA.name) &&
      normalizeDrugKey(target.drug2) === normalizeDrugKey(drugB.name)
    );
  }, []);

  const runAnalysis = useCallback(async () => {
    const currentDrug1 = drug1Ref.current;
    const currentDrug2 = drug2Ref.current;
    if (!currentDrug1 || !currentDrug2) return;

    setAnalysisLoading(true);
    setAnalysisTranslationReveal(false);
    setAnalysisTranslationFailed(false);

    try {
      const base = analyzeDrugInteraction(currentDrug1.name, currentDrug2.name);
      setAnalysis(base);
      analysisRef.current = base;
      await presentAnalysisForLocale(base, resolvedLocale);
    } catch (error) {
      notifyPhaeleonAiUnavailable(error);
      setAnalysisTranslationFailed(true);
    } finally {
      setAnalysisLoading(false);
    }
  }, [resolvedLocale, presentAnalysisForLocale, analysisMatchesPair, applyRuleBasedAnalysis]);

  const getAgentSnapshot = useCallback(() => agentStateRef.current, []);

  useEffect(() => {
    if (!analysis) {
      setDisplayAnalysis(null);
      setAnalysisTranslationLoading(false);
      setAnalysisTranslationReveal(false);
      setAnalysisTranslationFailed(false);
      resolvedLocaleRef.current = resolvedLocale;
      return;
    }

    if (resolvedLocaleRef.current === resolvedLocale) return;
    resolvedLocaleRef.current = resolvedLocale;
    void presentAnalysisForLocale(analysis, resolvedLocale);
  }, [analysis, resolvedLocale, presentAnalysisForLocale]);

  useEffect(() => {
    if (!settings.autoAnalyzeOnPair || !drug1 || !drug2) return;
    void runAnalysis();
  }, [settings.autoAnalyzeOnPair, drug1, drug2, runAnalysis]);

  const value = useMemo<PhaeleonContextValue>(
    () => ({
      settings,
      updateSettings,
      setLayoutPreset,
      resetLayoutToPreset,
      resetSettings,
      clearSession,
      swapDrugs,
      activeSlot,
      setActiveSlot,
      drug1,
      drug2,
      selectDrug,
      assignDrugToSlot,
      getAgentSnapshot,
      requestDrugAssign,
      pendingDrugAssign,
      confirmDrugAssign,
      cancelDrugAssign,
      clearDrug,
      searchQuery,
      setSearchQuery,
      searchHits,
      localSearchHits,
      recentSearches,
      searchLoading,
      searchError,
      runSearch,
      analysis,
      displayAnalysis,
      analysisTranslationLoading,
      analysisTranslationReveal,
      analysisTranslationFailed,
      analysisLoading,
      runAnalysis,
      canAnalyze,
      inspectorSlot,
      setInspectorSlot,
      drugProfile,
      drugProfileLoading,
      drug1Profile,
      drug2Profile,
      interactionResearch,
      interactionResearchLoading,
      assistantPairContextPinned,
      dismissAssistantPairContext,
    }),
    [
      settings,
      updateSettings,
      setLayoutPreset,
      resetLayoutToPreset,
      resetSettings,
      clearSession,
      swapDrugs,
      activeSlot,
      drug1,
      drug2,
      selectDrug,
      assignDrugToSlot,
      getAgentSnapshot,
      requestDrugAssign,
      pendingDrugAssign,
      confirmDrugAssign,
      cancelDrugAssign,
      clearDrug,
      searchQuery,
      searchHits,
      localSearchHits,
      recentSearches,
      searchLoading,
      searchError,
      runSearch,
      analysis,
      displayAnalysis,
      analysisTranslationLoading,
      analysisTranslationReveal,
      analysisTranslationFailed,
      analysisLoading,
      runAnalysis,
      canAnalyze,
      inspectorSlot,
      drugProfile,
      drugProfileLoading,
      drug1Profile,
      drug2Profile,
      interactionResearch,
      interactionResearchLoading,
      assistantPairContextPinned,
      dismissAssistantPairContext,
    ],
  );

  return <PhaeleonContext.Provider value={value}>{children}</PhaeleonContext.Provider>;
}

export function usePhaeleon(): PhaeleonContextValue {
  const ctx = useContext(PhaeleonContext);
  if (!ctx) throw new Error("usePhaeleon must be used within PhaeleonProvider");
  return ctx;
}

export function usePhaeleonOptional(): PhaeleonContextValue | null {
  return useContext(PhaeleonContext);
}
