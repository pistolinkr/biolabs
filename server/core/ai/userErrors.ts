import type { AiProviderId } from "@shared/ai/types";
import { AiProviderError } from "./providers/base.ts";

export type AiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_QUOTA_EXCEEDED"
  | "AI_MODEL_UNAVAILABLE"
  | "AI_NETWORK_ERROR"
  | "AI_ALL_PROVIDERS_FAILED"
  | "AI_REQUEST_INVALID"
  | "AI_EMPTY_RESPONSE"
  | "AI_RATE_LIMITED"
  | "AI_DAILY_BUDGET_EXCEEDED"
  | "AI_CONCURRENCY_LIMIT"
  | "AI_UNKNOWN";

const USER_MESSAGES: Record<AiErrorCode, string> = {
  AI_NOT_CONFIGURED: "AI is not configured on the server.",
  AI_QUOTA_EXCEEDED: "Provider quota exceeded. Try another provider in Settings.",
  AI_MODEL_UNAVAILABLE: "Selected model is unavailable. Check server model settings.",
  AI_NETWORK_ERROR: "Could not reach the AI provider. Check network and retry.",
  AI_ALL_PROVIDERS_FAILED: "All configured providers failed. Check Settings → AI Assistant.",
  AI_REQUEST_INVALID: "Invalid AI request.",
  AI_EMPTY_RESPONSE: "Provider returned an empty response.",
  AI_RATE_LIMITED: "Too many AI requests. Please wait a moment and retry.",
  AI_DAILY_BUDGET_EXCEEDED: "Daily AI usage limit reached. Try again later.",
  AI_CONCURRENCY_LIMIT: "Another AI request is still running. Wait for it to finish.",
  AI_UNKNOWN: "AI request failed.",
};

export interface AiUserErrorPayload {
  error: string;
  code: AiErrorCode;
  /** Suggested wait before retrying, set on rate/budget blocks. */
  retry_after_ms?: number;
}

export function userMessageForCode(code: AiErrorCode): string {
  return USER_MESSAGES[code] ?? USER_MESSAGES.AI_UNKNOWN;
}

export function classifyProviderError(err: AiProviderError): AiErrorCode {
  if (err.code) return err.code;
  const status = err.statusCode;
  const internal = err.message.toLowerCase();

  if (status === 429 || internal.includes("quota") || internal.includes("depleted")) {
    return "AI_QUOTA_EXCEEDED";
  }
  if (status === 404 || internal.includes("no endpoints") || internal.includes("not found")) {
    return "AI_MODEL_UNAVAILABLE";
  }
  if (
    status === 401 ||
    status === 403 ||
    internal.includes("unauthorized") ||
    internal.includes("invalid api key")
  ) {
    return "AI_NOT_CONFIGURED";
  }
  if (
    internal.includes("fetch failed") ||
    internal.includes("network") ||
    internal.includes("econnrefused") ||
    internal.includes("timeout")
  ) {
    return "AI_NETWORK_ERROR";
  }
  if (internal.includes("empty response")) {
    return "AI_EMPTY_RESPONSE";
  }
  if (internal.includes("upstream error") || internal.includes("payload error")) {
    if (status === 429) return "AI_QUOTA_EXCEEDED";
    if (status === 404) return "AI_MODEL_UNAVAILABLE";
    if (status && status >= 500) return "AI_NETWORK_ERROR";
  }
  return "AI_UNKNOWN";
}

export function sanitizeAiError(error: unknown, logPrefix = "[biolabs-ai]"): AiUserErrorPayload {
  if (error instanceof AiProviderError) {
    console.error(`${logPrefix} provider=${error.provider} status=${error.statusCode ?? "n/a"}`, error.message);
    if (error.message === "all providers failed" || error.message === "no providers configured") {
      return { code: "AI_ALL_PROVIDERS_FAILED", error: userMessageForCode("AI_ALL_PROVIDERS_FAILED") };
    }
    const code = classifyProviderError(error);
    return { code, error: userMessageForCode(code) };
  }

  if (error instanceof Error) {
    console.error(`${logPrefix}`, error.message);
    const lower = error.message.toLowerCase();
    if (lower.includes("fetch failed") || lower.includes("network")) {
      return { code: "AI_NETWORK_ERROR", error: userMessageForCode("AI_NETWORK_ERROR") };
    }
  } else {
    console.error(`${logPrefix}`, error);
  }

  return { code: "AI_UNKNOWN", error: userMessageForCode("AI_UNKNOWN") };
}

export function invalidRequest(code: AiErrorCode, detail?: string): AiUserErrorPayload {
  if (detail) console.warn("[biolabs-ai] invalid request:", detail);
  return { code, error: userMessageForCode(code) };
}

/** Build a structured rate/budget block payload with a retry hint. */
export function rateLimited(code: AiErrorCode, retryAfterMs?: number): AiUserErrorPayload {
  return {
    code,
    error: userMessageForCode(code),
    ...(retryAfterMs && retryAfterMs > 0 ? { retry_after_ms: retryAfterMs } : {}),
  };
}

export function providerFailureLog(provider: AiProviderId, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[biolabs-ai] provider=${provider} failed:`, msg);
}

/** Map any thrown value to an AiErrorCode for fallback routing decisions. */
export function codeForError(error: unknown): AiErrorCode {
  if (error instanceof AiProviderError) {
    return classifyProviderError(error);
  }
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("fetch failed") || lower.includes("network") || lower.includes("timeout")) {
      return "AI_NETWORK_ERROR";
    }
  }
  return "AI_UNKNOWN";
}

/**
 * Whether the router should move on to the next provider/model candidate.
 * Retryable = transient or provider-specific; the same request can succeed elsewhere.
 */
export function isRetryableAiCode(code: AiErrorCode): boolean {
  return (
    code === "AI_QUOTA_EXCEEDED" ||
    code === "AI_NETWORK_ERROR" ||
    code === "AI_EMPTY_RESPONSE" ||
    code === "AI_MODEL_UNAVAILABLE" ||
    code === "AI_NOT_CONFIGURED" ||
    code === "AI_UNKNOWN"
  );
}

/**
 * Whether a transient error is worth retrying on the SAME model before
 * falling over (network blips / 5xx / empty). Quota (429) is never retried
 * in place — it goes straight to cooldown + next candidate.
 */
export function isTransientAiCode(code: AiErrorCode): boolean {
  return code === "AI_NETWORK_ERROR" || code === "AI_EMPTY_RESPONSE";
}

/** Whether a failure should cool down the WHOLE provider (vs. just skip a model). */
export function isProviderLevelFailure(code: AiErrorCode): boolean {
  // 404 model-unavailable is model-specific — try the provider's next model
  // without penalizing the provider. Everything else is account/transport level.
  return code !== "AI_MODEL_UNAVAILABLE";
}
