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
  | "AI_UNKNOWN";

const USER_MESSAGES: Record<AiErrorCode, string> = {
  AI_NOT_CONFIGURED: "AI is not configured on the server.",
  AI_QUOTA_EXCEEDED: "Provider quota exceeded. Try another provider in Settings.",
  AI_MODEL_UNAVAILABLE: "Selected model is unavailable. Check server model settings.",
  AI_NETWORK_ERROR: "Could not reach the AI provider. Check network and retry.",
  AI_ALL_PROVIDERS_FAILED: "All configured providers failed. Check Settings → AI Assistant.",
  AI_REQUEST_INVALID: "Invalid AI request.",
  AI_EMPTY_RESPONSE: "Provider returned an empty response.",
  AI_UNKNOWN: "AI request failed.",
};

export interface AiUserErrorPayload {
  error: string;
  code: AiErrorCode;
}

export function userMessageForCode(code: AiErrorCode): string {
  return USER_MESSAGES[code] ?? USER_MESSAGES.AI_UNKNOWN;
}

function classifyProviderError(err: AiProviderError): AiErrorCode {
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
    return "AI_UNKNOWN";
  }
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

export function providerFailureLog(provider: AiProviderId, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[biolabs-ai] provider=${provider} failed:`, msg);
}
