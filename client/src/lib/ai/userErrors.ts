import type { AiErrorCode } from "@shared/ai/types";
import { i18n } from "@/i18n";

export class AiRequestError extends Error {
  readonly code: AiErrorCode;
  /** Suggested wait before retrying, set on rate/budget blocks. */
  readonly retryAfterMs?: number;

  constructor(code: AiErrorCode, message: string, retryAfterMs?: number) {
    super(message);
    this.name = "AiRequestError";
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

function translateErrorCode(code: AiErrorCode, fallback?: string): string {
  if (i18n.isInitialized) {
    const translated = i18n.t(code, { ns: "errors", defaultValue: "" });
    if (translated) return translated;
  }
  if (fallback) return fallback;
  if (i18n.isInitialized) {
    return i18n.t("AI_UNKNOWN", { ns: "errors" });
  }
  return "AI request failed.";
}

export function formatAiUserNotice(code: AiErrorCode, message?: string): string {
  const text = translateErrorCode(code, message);
  return `${text} (${code})`;
}

export function noticeFromUnknownError(error: unknown): string {
  if (error instanceof AiRequestError) {
    return formatAiUserNotice(error.code, error.message);
  }
  if (error instanceof Error) {
    console.error("[biolabs-ai] unexpected client error:", error.message);
  }
  return formatAiUserNotice("AI_UNKNOWN");
}
