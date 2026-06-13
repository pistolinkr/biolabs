export const STRUCTURE_ANALYSIS_HISTORY_KEY = "biolabs.structureAnalysis.history.v1";

export interface StructureAnalysisEntry {
  id: string;
  proteinKey: string;
  proteinLabel: string;
  prompt: string;
  answer: string;
  error: boolean;
  createdAt: string;
}

interface HistoryStore {
  version: 1;
  byProtein: Record<string, StructureAnalysisEntry[]>;
}

function emptyStore(): HistoryStore {
  return { version: 1, byProtein: {} };
}

function readStore(): HistoryStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = sessionStorage.getItem(STRUCTURE_ANALYSIS_HISTORY_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as HistoryStore;
    if (!parsed || parsed.version !== 1 || typeof parsed.byProtein !== "object") {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

function writeStore(store: HistoryStore): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STRUCTURE_ANALYSIS_HISTORY_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function loadStructureAnalysisHistory(proteinKey: string): StructureAnalysisEntry[] {
  const store = readStore();
  return store.byProtein[proteinKey] ?? [];
}

export function appendStructureAnalysisHistory(
  proteinKey: string,
  entry: StructureAnalysisEntry,
): StructureAnalysisEntry[] {
  const store = readStore();
  const prev = store.byProtein[proteinKey] ?? [];
  const next = [...prev, entry].slice(-20);
  store.byProtein[proteinKey] = next;
  writeStore(store);
  return next;
}

export function findLatestStructureEntry(
  entries: StructureAnalysisEntry[],
): StructureAnalysisEntry | null {
  if (entries.length === 0) return null;
  return entries[entries.length - 1] ?? null;
}
