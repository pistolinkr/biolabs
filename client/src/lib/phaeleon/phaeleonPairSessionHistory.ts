import type { InteractionRisk } from "@/lib/phaeleon/types";
import { phaeleonPairHistoryKey } from "@/lib/phaeleon/phaeleonChatHistory";
import {
  clearScopedStore,
  readScopedStore,
  writeScopedStore,
} from "@/lib/session/scopedHistoryStore";

export const PHAELEON_PAIR_SESSIONS_BASE_KEY = "biolabs.phaeleon.pairSessions.v1";
const MAX_ENTRIES = 24;

export interface PhaeleonPairSessionEntry {
  id: string;
  pairKey: string;
  drug1: string;
  drug2: string;
  risk?: InteractionRisk;
  analyzedAt: string;
  messageCount: number;
}

interface PairSessionStore {
  version: 1;
  entries: PhaeleonPairSessionEntry[];
}

function emptyStore(): PairSessionStore {
  return { version: 1, entries: [] };
}

function readStore(): PairSessionStore {
  const store = readScopedStore(PHAELEON_PAIR_SESSIONS_BASE_KEY, emptyStore, "local");
  if (!store || store.version !== 1 || !Array.isArray(store.entries)) {
    return emptyStore();
  }
  return store;
}

function writeStore(store: PairSessionStore): void {
  writeScopedStore(PHAELEON_PAIR_SESSIONS_BASE_KEY, store, "local");
}

export function listPhaeleonPairSessions(): PhaeleonPairSessionEntry[] {
  return readStore().entries;
}

export function upsertPhaeleonPairSession(input: {
  drug1: string;
  drug2: string;
  risk?: InteractionRisk;
  messageCount?: number;
}): PhaeleonPairSessionEntry[] {
  const pairKey = phaeleonPairHistoryKey(input.drug1, input.drug2);
  const store = readStore();
  const now = new Date().toISOString();
  const existing = store.entries.find((e) => e.pairKey === pairKey);
  const nextEntry: PhaeleonPairSessionEntry = existing
    ? {
        ...existing,
        risk: input.risk ?? existing.risk,
        analyzedAt: now,
        messageCount: input.messageCount ?? existing.messageCount,
      }
    : {
        id: `pair-${pairKey}-${Date.now()}`,
        pairKey,
        drug1: input.drug1,
        drug2: input.drug2,
        risk: input.risk,
        analyzedAt: now,
        messageCount: input.messageCount ?? 0,
      };

  const rest = store.entries.filter((e) => e.pairKey !== pairKey);
  store.entries = [nextEntry, ...rest].slice(0, MAX_ENTRIES);
  writeStore(store);
  return store.entries;
}

export function clearPhaeleonPairSessions(): void {
  clearScopedStore(PHAELEON_PAIR_SESSIONS_BASE_KEY, "local");
}
