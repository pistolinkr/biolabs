import { proteinSelectionKey, type ProteinSelection } from "@/lib/proteinApis";

export const RESIDUE_ANALYSIS_HISTORY_KEY = "biolabs.residueAnalysis.history.v1";

export interface ResidueAnalysisEntry {
  id: string;
  proteinKey: string;
  residueKey: string;
  chain: string;
  resno: string;
  resname: string;
  prompt: string;
  answer: string;
  error: boolean;
  createdAt: string;
}

interface HistoryStore {
  version: 1;
  byProtein: Record<string, ResidueAnalysisEntry[]>;
}

function emptyStore(): HistoryStore {
  return { version: 1, byProtein: {} };
}

function readStore(): HistoryStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = sessionStorage.getItem(RESIDUE_ANALYSIS_HISTORY_KEY);
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
    sessionStorage.setItem(RESIDUE_ANALYSIS_HISTORY_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function proteinKeyFromSelection(selection: ProteinSelection | null): string | null {
  if (!selection) return null;
  return proteinSelectionKey(selection);
}

export function loadResidueAnalysisHistory(proteinKey: string): ResidueAnalysisEntry[] {
  const store = readStore();
  return store.byProtein[proteinKey] ?? [];
}

export function appendResidueAnalysisHistory(
  proteinKey: string,
  entry: ResidueAnalysisEntry,
): ResidueAnalysisEntry[] {
  const store = readStore();
  const prev = store.byProtein[proteinKey] ?? [];
  const next = [...prev, entry].slice(-40);
  store.byProtein[proteinKey] = next;
  writeStore(store);
  return next;
}
