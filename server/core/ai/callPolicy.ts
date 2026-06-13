import type { AiCallBudget } from "@shared/ai/types";
import { intentWeight, type AiServerConfig } from "./config.ts";

/**
 * Global, intent-weighted call policy that sits above the per-provider
 * {@link ./usageLimiter.ts usageLimiter}. It protects the shared free-tier
 * budget regardless of which provider ultimately serves a request.
 *
 * State is process-local (resets on restart) — no external store, matching the
 * platform's local-first, zero-operational-cost design.
 */

const RPM_WINDOW_MS = 60_000;

interface WeightedHit {
  t: number;
  weight: number;
}

interface PolicyState {
  /** Weighted hits within the rolling RPM window. */
  recent: WeightedHit[];
  /** Local calendar day key the daily counter belongs to. */
  dayKey: string;
  dayUnits: number;
  /** Requests currently being processed upstream. */
  inFlight: number;
}

const state: PolicyState = { recent: [], dayKey: "", dayUnits: 0, inFlight: 0 };

function dayKeyFor(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function msUntilLocalMidnight(now: number): number {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now);
}

/** Drop expired RPM hits and roll the daily counter over at midnight. */
function prune(now: number): void {
  const today = dayKeyFor(now);
  if (state.dayKey !== today) {
    state.dayKey = today;
    state.dayUnits = 0;
  }
  state.recent = state.recent.filter((h) => now - h.t < RPM_WINDOW_MS);
}

function rpmUnits(): number {
  return state.recent.reduce((sum, h) => sum + h.weight, 0);
}

/** ms until enough weighted RPM units expire to admit `weight` more. */
function rpmRetryAfter(weight: number, limit: number, now: number): number {
  let freed = limit - rpmUnits();
  // Oldest hits expire first; find the timestamp that frees enough headroom.
  for (const h of state.recent) {
    if (freed >= weight) break;
    freed += h.weight;
    if (freed >= weight) {
      return Math.max(0, RPM_WINDOW_MS - (now - h.t));
    }
  }
  return RPM_WINDOW_MS;
}

export type CallBlockReason = "rpm" | "daily" | "concurrency";

export interface CallPolicyDecision {
  ok: boolean;
  reason?: CallBlockReason;
  retryAfterMs?: number;
}

/**
 * Check (without recording) whether a call of the given intent fits the global
 * budget. Concurrency is enforced separately via {@link acquireSlot}.
 */
export function checkCallPolicy(
  intent: string,
  config: AiServerConfig,
  now = Date.now(),
): CallPolicyDecision {
  prune(now);
  const weight = intentWeight(config, intent);

  if (state.dayUnits + weight > config.globalDaily) {
    return { ok: false, reason: "daily", retryAfterMs: msUntilLocalMidnight(now) };
  }
  if (rpmUnits() + weight > config.globalRpm) {
    return { ok: false, reason: "rpm", retryAfterMs: rpmRetryAfter(weight, config.globalRpm, now) };
  }
  return { ok: true };
}

/** Try to reserve a concurrency slot; returns false if at capacity. */
export function acquireSlot(config: AiServerConfig): boolean {
  if (state.inFlight >= config.maxConcurrent) return false;
  state.inFlight += 1;
  return true;
}

/** Release a previously-acquired concurrency slot. */
export function releaseSlot(): void {
  state.inFlight = Math.max(0, state.inFlight - 1);
}

/** Record a successful upstream call against the global budget. */
export function recordCallPolicy(
  intent: string,
  config: AiServerConfig,
  now = Date.now(),
): void {
  prune(now);
  const weight = intentWeight(config, intent);
  state.recent.push({ t: now, weight });
  state.dayUnits += weight;
}

/** Snapshot for the status endpoint / UI. */
export function callBudgetSnapshot(config: AiServerConfig, now = Date.now()): AiCallBudget {
  prune(now);
  const rpmUsed = rpmUnits();
  let retryAfterMs = 0;
  if (state.dayUnits >= config.globalDaily) {
    retryAfterMs = msUntilLocalMidnight(now);
  } else if (rpmUsed >= config.globalRpm) {
    retryAfterMs = rpmRetryAfter(1, config.globalRpm, now);
  }
  return {
    rpm_used: Math.round(rpmUsed * 100) / 100,
    rpm_limit: config.globalRpm,
    daily_used: Math.round(state.dayUnits * 100) / 100,
    daily_limit: config.globalDaily,
    concurrent_in_flight: state.inFlight,
    concurrent_limit: config.maxConcurrent,
    retry_after_ms: retryAfterMs,
    strict: config.strictLimits,
  };
}

/** Test-only: wipe policy state. */
export function __resetCallPolicy(): void {
  state.recent = [];
  state.dayKey = "";
  state.dayUnits = 0;
  state.inFlight = 0;
}
