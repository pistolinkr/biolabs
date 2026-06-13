import type { AiProviderId } from "@shared/ai/types";
import type { AiServerConfig } from "./config.ts";

/**
 * In-memory per-provider usage accounting (call management + budget).
 *
 * Tracks a sliding 60s window for RPM and a per-day counter for the daily cap.
 * State is process-local and resets on restart — no external store, matching the
 * platform's local-first, zero-operational-cost design.
 */
interface ProviderUsageState {
  /** Request timestamps (ms) within the rolling RPM window. */
  recent: number[];
  /** Local calendar day key (YYYY-MM-DD) the daily counter belongs to. */
  dayKey: string;
  dayCount: number;
}

const RPM_WINDOW_MS = 60_000;

const registry = new Map<AiProviderId, ProviderUsageState>();

function dayKeyFor(now: number): string {
  // Local-time day boundary (toxic to UTC servers is acceptable for a soft cap).
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function stateFor(id: AiProviderId, now: number): ProviderUsageState {
  let s = registry.get(id);
  const today = dayKeyFor(now);
  if (!s) {
    s = { recent: [], dayKey: today, dayCount: 0 };
    registry.set(id, s);
  }
  if (s.dayKey !== today) {
    s.dayKey = today;
    s.dayCount = 0;
  }
  s.recent = s.recent.filter((t) => now - t < RPM_WINDOW_MS);
  return s;
}

export type UsageBlockReason = "rpm" | "daily";

export interface UsageDecision {
  ok: boolean;
  reason?: UsageBlockReason;
}

/** Check (without recording) whether a provider is within its budget. */
export function usageAllows(
  id: AiProviderId,
  config: AiServerConfig,
  now = Date.now(),
): UsageDecision {
  const s = stateFor(id, now);
  if (s.dayCount >= config.providerDailyLimit) return { ok: false, reason: "daily" };
  if (s.recent.length >= config.providerRpm) return { ok: false, reason: "rpm" };
  return { ok: true };
}

/** Record a successful (counted) request against a provider's budget. */
export function recordUsage(id: AiProviderId, now = Date.now()): void {
  const s = stateFor(id, now);
  s.recent.push(now);
  s.dayCount += 1;
}

export interface ProviderUsageSnapshot {
  requests_last_minute: number;
  requests_today: number;
}

export function usageSnapshot(id: AiProviderId, now = Date.now()): ProviderUsageSnapshot {
  const s = stateFor(id, now);
  return { requests_last_minute: s.recent.length, requests_today: s.dayCount };
}

/** Test-only: wipe usage state. */
export function __resetUsage(): void {
  registry.clear();
}
