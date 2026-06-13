import type { AiErrorCode } from "@shared/ai/types";
import { AiRequestError } from "@/lib/ai/userErrors";

/**
 * Client-side call gate — the first line of defense before any AI request hits
 * the network. It prevents UI spam (rapid repeated clicks), duplicate analyses,
 * and runaway local usage, complementing the server-side global call policy.
 *
 * All state is in-memory except the daily soft cap, which persists in
 * localStorage so the UI stays protected even when the server is unreachable.
 */

const DAILY_STORAGE_KEY = "biolabs.ai.clientUsage.v1";

export interface CallGateConfig {
  /** Max concurrent in-flight requests (synced from server budget). */
  maxConcurrent: number;
  /** Per-intent minimum spacing between identical-intent calls (ms). */
  minIntervalMs: Partial<Record<string, number>>;
  /** Window in which an identical request is treated as a duplicate (ms). */
  dedupTtlMs: number;
  /** Local soft cap on calls per day. */
  localDailyCap: number;
}

const config: CallGateConfig = {
  maxConcurrent: 2,
  minIntervalMs: { structure: 8_000 },
  dedupTtlMs: 60_000,
  localDailyCap: 500,
};

interface GateState {
  inFlight: number;
  /** Last accepted call time per intent. */
  lastCallAt: Map<string, number>;
  /** Fingerprint → last accepted time, for dedup. */
  recent: Map<string, number>;
  /** Global cooldown end time, synced from a server 429 retry hint. */
  cooldownUntil: number;
}

const state: GateState = {
  inFlight: 0,
  lastCallAt: new Map(),
  recent: new Map(),
  cooldownUntil: 0,
};

export interface AssertParams {
  intent: string;
  contextFingerprint: string;
  prompt: string;
}

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

function fingerprintFor(p: AssertParams): string {
  return `${p.intent}|${p.contextFingerprint}|${hashString(p.prompt)}`;
}

function dayKeyFor(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function msUntilLocalMidnight(now: number): number {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now);
}

interface DailyUsage {
  dayKey: string;
  count: number;
}

function readDailyUsage(now: number): DailyUsage {
  const today = dayKeyFor(now);
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyUsage;
      if (parsed.dayKey === today && typeof parsed.count === "number") return parsed;
    }
  } catch {
    /* ignore corrupt / unavailable storage */
  }
  return { dayKey: today, count: 0 };
}

function writeDailyUsage(usage: DailyUsage): void {
  try {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(usage));
  } catch {
    /* storage may be unavailable (private mode); soft cap simply won't persist */
  }
}

function blocked(code: AiErrorCode, message: string, retryAfterMs?: number): never {
  throw new AiRequestError(code, message, retryAfterMs);
}

/** Update gate config from the server budget snapshot. */
export function configureCallGate(patch: Partial<CallGateConfig>): void {
  if (typeof patch.maxConcurrent === "number" && patch.maxConcurrent > 0) {
    config.maxConcurrent = patch.maxConcurrent;
  }
  if (typeof patch.localDailyCap === "number" && patch.localDailyCap > 0) {
    config.localDailyCap = patch.localDailyCap;
  }
  if (typeof patch.dedupTtlMs === "number" && patch.dedupTtlMs > 0) {
    config.dedupTtlMs = patch.dedupTtlMs;
  }
  if (patch.minIntervalMs) {
    config.minIntervalMs = { ...config.minIntervalMs, ...patch.minIntervalMs };
  }
}

/** Sync a server-provided retry hint into a local cooldown. */
export function noteServerRetryAfter(retryAfterMs: number | undefined, now = Date.now()): void {
  if (retryAfterMs && retryAfterMs > 0) {
    state.cooldownUntil = Math.max(state.cooldownUntil, now + retryAfterMs);
  }
}

/**
 * Throw an {@link AiRequestError} if a call should not proceed. Checks (in order):
 * server cooldown, concurrency, per-intent spacing, duplicate request, daily cap.
 */
export function assertCallAllowed(params: AssertParams, now = Date.now()): void {
  if (state.cooldownUntil > now) {
    blocked("AI_RATE_LIMITED", "Please wait before sending another request.", state.cooldownUntil - now);
  }

  if (state.inFlight >= config.maxConcurrent) {
    blocked("AI_CONCURRENCY_LIMIT", "Another AI request is still running.");
  }

  const minInterval = config.minIntervalMs[params.intent] ?? 0;
  if (minInterval > 0) {
    const last = state.lastCallAt.get(params.intent);
    if (last !== undefined && now - last < minInterval) {
      blocked("AI_RATE_LIMITED", "This action was used too recently.", minInterval - (now - last));
    }
  }

  const fp = fingerprintFor(params);
  const seenAt = state.recent.get(fp);
  if (seenAt !== undefined && now - seenAt < config.dedupTtlMs) {
    blocked("AI_RATE_LIMITED", "Identical request was just made.", config.dedupTtlMs - (now - seenAt));
  }

  const usage = readDailyUsage(now);
  if (usage.count >= config.localDailyCap) {
    blocked("AI_DAILY_BUDGET_EXCEEDED", "Daily AI usage limit reached.", msUntilLocalMidnight(now));
  }
}

/** Reserve an in-flight slot; returns a release function. */
export function beginCall(): () => void {
  state.inFlight += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.inFlight = Math.max(0, state.inFlight - 1);
  };
}

/** Record a successfully-issued call for dedup, spacing, and daily accounting. */
export function recordCall(params: AssertParams, now = Date.now()): void {
  state.lastCallAt.set(params.intent, now);
  state.recent.set(fingerprintFor(params), now);
  // Bound the dedup map.
  if (state.recent.size > 200) {
    state.recent.forEach((ts, key) => {
      if (now - ts >= config.dedupTtlMs) state.recent.delete(key);
    });
  }
  const usage = readDailyUsage(now);
  writeDailyUsage({ dayKey: usage.dayKey, count: usage.count + 1 });
}

/** Local daily usage snapshot for UI. */
export function localDailyUsage(now = Date.now()): { used: number; cap: number } {
  return { used: readDailyUsage(now).count, cap: config.localDailyCap };
}

/** Test-only: reset gate state and config to defaults. */
export function __resetCallGate(): void {
  state.inFlight = 0;
  state.lastCallAt.clear();
  state.recent.clear();
  state.cooldownUntil = 0;
  config.maxConcurrent = 2;
  config.minIntervalMs = { structure: 8_000 };
  config.dedupTtlMs = 60_000;
  config.localDailyCap = 500;
  try {
    localStorage.removeItem(DAILY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
