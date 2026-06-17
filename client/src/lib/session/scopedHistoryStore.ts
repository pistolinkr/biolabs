import { getOrCreateAppSessionId } from "@/lib/session/cookieSession";

export type HistoryStorageKind = "session" | "local";

function storageFor(kind: HistoryStorageKind): Storage | null {
  if (typeof window === "undefined") return null;
  return kind === "local" ? window.localStorage : window.sessionStorage;
}

export function scopedHistoryKey(baseKey: string, sessionId = getOrCreateAppSessionId()): string {
  return `${baseKey}.${sessionId}`;
}

export function readScopedStore<T>(
  baseKey: string,
  empty: () => T,
  kind: HistoryStorageKind = "session",
  sessionId = getOrCreateAppSessionId(),
): T {
  const storage = storageFor(kind);
  if (!storage) return empty();
  try {
    const raw = storage.getItem(scopedHistoryKey(baseKey, sessionId));
    if (!raw) return empty();
    return JSON.parse(raw) as T;
  } catch {
    return empty();
  }
}

export function writeScopedStore<T>(
  baseKey: string,
  value: T,
  kind: HistoryStorageKind = "session",
  sessionId = getOrCreateAppSessionId(),
): void {
  const storage = storageFor(kind);
  if (!storage) return;
  try {
    storage.setItem(scopedHistoryKey(baseKey, sessionId), JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function clearScopedStore(
  baseKey: string,
  kind: HistoryStorageKind = "session",
  sessionId = getOrCreateAppSessionId(),
): void {
  const storage = storageFor(kind);
  if (!storage) return;
  try {
    storage.removeItem(scopedHistoryKey(baseKey, sessionId));
  } catch {
    /* ignore */
  }
}

export function clearAllScopedStoresForSession(
  baseKey: string,
  kinds: HistoryStorageKind[] = ["session", "local"],
): void {
  for (const kind of kinds) {
    clearScopedStore(baseKey, kind);
  }
}
