import type { DrugSlot } from "@/lib/phaeleon/types";
import {
  clearScopedStore,
  readScopedStore,
  writeScopedStore,
} from "@/lib/session/scopedHistoryStore";

export const PHAELEON_ACTIVE_SESSION_BASE_KEY = "biolabs.phaeleon.activeSession.v1";

export interface PhaeleonActiveSessionSnapshot {
  version: 1;
  drug1: DrugSlot | null;
  drug2: DrugSlot | null;
  assistantPairContextPinned: boolean;
  updatedAt: string;
}

function emptySnapshot(): PhaeleonActiveSessionSnapshot {
  return {
    version: 1,
    drug1: null,
    drug2: null,
    assistantPairContextPinned: true,
    updatedAt: new Date().toISOString(),
  };
}

export function loadPhaeleonActiveSession(): PhaeleonActiveSessionSnapshot | null {
  const raw = readScopedStore(PHAELEON_ACTIVE_SESSION_BASE_KEY, emptySnapshot, "session");
  if (!raw || raw.version !== 1) return null;
  if (!raw.drug1 && !raw.drug2) return null;
  return raw;
}

export function savePhaeleonActiveSession(input: {
  drug1: DrugSlot | null;
  drug2: DrugSlot | null;
  assistantPairContextPinned: boolean;
}): void {
  writeScopedStore(
    PHAELEON_ACTIVE_SESSION_BASE_KEY,
    {
      version: 1,
      drug1: input.drug1,
      drug2: input.drug2,
      assistantPairContextPinned: input.assistantPairContextPinned,
      updatedAt: new Date().toISOString(),
    } satisfies PhaeleonActiveSessionSnapshot,
    "session",
  );
}

export function clearPhaeleonActiveSession(): void {
  clearScopedStore(PHAELEON_ACTIVE_SESSION_BASE_KEY, "session");
}
