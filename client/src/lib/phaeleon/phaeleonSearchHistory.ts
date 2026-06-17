const STORAGE_KEY = "biolabs.phaeleon.searchHistory.v1";
const MAX_ENTRIES = 8;

export function loadPhaeleonSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function pushPhaeleonSearchHistory(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed || typeof window === "undefined") return loadPhaeleonSearchHistory();
  const prev = loadPhaeleonSearchHistory().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...prev].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}
