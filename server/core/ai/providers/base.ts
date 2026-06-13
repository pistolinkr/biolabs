import type { AiChatMessage, AiErrorCode, AiProviderId } from "@shared/ai/types";

export interface AiCompletionOptions {
  maxOutputTokens: number;
  temperature: number;
  /** Override the provider's default model (used for per-model fallback). */
  model?: string;
}

export interface AiProviderResult {
  text: string;
  model: string;
  provider: AiProviderId;
}

export interface AiProvider {
  id: AiProviderId;
  isConfigured(): boolean;
  complete(messages: AiChatMessage[], options: AiCompletionOptions): Promise<AiProviderResult>;
}

export class AiProviderError extends Error {
  provider: AiProviderId;
  statusCode?: number;
  /** Suggested cooldown derived from a Retry-After header, in milliseconds. */
  retryAfterMs?: number;
  /** Model that produced the error (for attempt logging). */
  model?: string;
  /** Explicit error code that overrides status/message classification. */
  code?: AiErrorCode;

  constructor(
    message: string,
    provider: AiProviderId,
    statusCode?: number,
    extra?: { retryAfterMs?: number; model?: string; code?: AiErrorCode },
  ) {
    super(message);
    this.name = "AiProviderError";
    this.provider = provider;
    this.statusCode = statusCode;
    this.retryAfterMs = extra?.retryAfterMs;
    this.model = extra?.model;
    this.code = extra?.code;
  }
}

/**
 * Parse a `Retry-After` header (seconds or HTTP date) into milliseconds.
 * Returns undefined when absent or unparseable.
 */
export function parseRetryAfterMs(res: Response): number | undefined {
  const raw = res.headers.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 3_600_000);
  const dateMs = Date.parse(raw);
  if (Number.isFinite(dateMs)) {
    const delta = dateMs - Date.now();
    if (delta > 0) return Math.min(delta, 3_600_000);
  }
  return undefined;
}
