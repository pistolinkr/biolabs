import type { AiErrorCode, AiProviderId } from "@shared/ai/types";
import type { AiServerConfig } from "./config.ts";
import { isProviderLevelFailure } from "./userErrors.ts";

/**
 * In-memory circuit breaker for AI providers.
 *
 * State lives in the Node process only — it resets on restart and is NOT shared
 * across instances. That is intentional: the platform is local / single-process
 * first (Node or Docker), so this avoids any external store or cloud dependency.
 */
interface ProviderHealthState {
  cooldownUntil: number;
  consecutiveFailures: number;
  lastErrorCode: AiErrorCode | null;
}

const registry = new Map<AiProviderId, ProviderHealthState>();

function stateFor(id: AiProviderId): ProviderHealthState {
  let s = registry.get(id);
  if (!s) {
    s = { cooldownUntil: 0, consecutiveFailures: 0, lastErrorCode: null };
    registry.set(id, s);
  }
  return s;
}

/** Whether a provider is currently cooling down and should be skipped. */
export function isInCooldown(id: AiProviderId, now = Date.now()): boolean {
  return stateFor(id).cooldownUntil > now;
}

/** Remaining cooldown for a provider in ms (0 when available). */
export function cooldownRemainingMs(id: AiProviderId, now = Date.now()): number {
  return Math.max(0, stateFor(id).cooldownUntil - now);
}

/** Absolute cooldown expiry timestamp, or null if not cooling down. */
export function cooldownUntil(id: AiProviderId, now = Date.now()): number | null {
  const until = stateFor(id).cooldownUntil;
  return until > now ? until : null;
}

/**
 * Record a failure. Provider-level failures (quota / network / auth) trip the
 * breaker with exponential backoff, honoring an explicit Retry-After when given.
 * Model-specific failures (404) do not penalize the whole provider.
 */
export function markFailure(
  id: AiProviderId,
  code: AiErrorCode,
  config: AiServerConfig,
  retryAfterMs?: number,
  now = Date.now(),
): void {
  const s = stateFor(id);
  s.lastErrorCode = code;

  if (!isProviderLevelFailure(code)) return;

  s.consecutiveFailures += 1;
  const backoff = Math.min(
    config.cooldownBaseMs * 2 ** (s.consecutiveFailures - 1),
    config.cooldownMaxMs,
  );
  const cooldown = Math.max(retryAfterMs ?? 0, backoff);
  s.cooldownUntil = now + cooldown;
}

/** Clear breaker state after a successful call. */
export function markSuccess(id: AiProviderId): void {
  const s = stateFor(id);
  s.cooldownUntil = 0;
  s.consecutiveFailures = 0;
  s.lastErrorCode = null;
}

export interface ProviderCooldownSnapshot {
  cooldown_until: number | null;
  consecutive_failures: number;
  last_error_code: AiErrorCode | null;
}

export function cooldownSnapshot(id: AiProviderId, now = Date.now()): ProviderCooldownSnapshot {
  const s = stateFor(id);
  return {
    cooldown_until: s.cooldownUntil > now ? s.cooldownUntil : null,
    consecutive_failures: s.consecutiveFailures,
    last_error_code: s.lastErrorCode,
  };
}

/** Test-only: wipe breaker state. */
export function __resetProviderHealth(): void {
  registry.clear();
}
