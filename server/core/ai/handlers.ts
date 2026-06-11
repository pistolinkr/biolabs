import type {
  AiChatRequest,
  AiChatResponse,
  AiExplainIntent,
  AiPlatformContext,
  AiStatusResponse,
} from "@shared/ai/types";
import { listAvailableProviders, loadAiConfig, resolveActiveProvider } from "./config.ts";
import { buildPromptMessages } from "./promptBuilder.ts";
import { completeWithProvider } from "./providerRouter.ts";
import { AiProviderError } from "./providers/base.ts";
import { invalidRequest, sanitizeAiError, type AiUserErrorPayload } from "./userErrors.ts";

function isValidContext(ctx: unknown): ctx is AiPlatformContext {
  if (!ctx || typeof ctx !== "object") return false;
  const o = ctx as Record<string, unknown>;
  return typeof o.assembled_at === "string" && typeof o.context_fingerprint === "string";
}

function isValidIntent(v: unknown): v is AiExplainIntent {
  return (
    v === "general" ||
    v === "residue" ||
    v === "chain" ||
    v === "domain" ||
    v === "mutation" ||
    v === "structure" ||
    v === "analysis" ||
    v === "selection"
  );
}

export async function handleAiChat(
  body: unknown,
): Promise<{ status: number; json: AiChatResponse | AiUserErrorPayload }> {
  const config = loadAiConfig();
  const req = body as Partial<AiChatRequest>;

  if (!req || !Array.isArray(req.messages) || req.messages.length === 0) {
    return { status: 400, json: invalidRequest("AI_REQUEST_INVALID", "messages required") };
  }

  if (!isValidContext(req.context)) {
    return { status: 400, json: invalidRequest("AI_REQUEST_INVALID", "context required") };
  }

  const userMessages = req.messages.filter(
    (m) =>
      m &&
      typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim().length > 0,
  );

  if (userMessages.length === 0) {
    return { status: 400, json: invalidRequest("AI_REQUEST_INVALID", "no user messages") };
  }

  const intent: AiExplainIntent = isValidIntent(req.intent) ? req.intent : "general";

  const temperature =
    typeof req.generation?.temperature === "number"
      ? Math.min(1, Math.max(0, req.generation.temperature))
      : 0.35;
  const maxOutputTokens =
    typeof req.generation?.maxOutputTokens === "number"
      ? Math.min(config.maxOutputTokens, Math.max(128, Math.floor(req.generation.maxOutputTokens)))
      : config.maxOutputTokens;

  const promptMessages = buildPromptMessages(
    req.context,
    userMessages,
    intent,
    config.maxContextChars,
    req.generation,
  );

  try {
    const result = await completeWithProvider(
      promptMessages,
      { maxOutputTokens, temperature },
      req.provider,
    );

    const response: AiChatResponse = {
      message: result.text,
      provider: result.provider,
      model: result.model,
      context_fingerprint: req.context.context_fingerprint,
    };

    return { status: 200, json: response };
  } catch (e) {
    return { status: 502, json: sanitizeAiError(e) };
  }
}

export function handleAiStatus(): { status: number; json: AiStatusResponse } {
  const config = loadAiConfig();
  const available = listAvailableProviders(config);
  const active = resolveActiveProvider(config);

  return {
    status: 200,
    json: {
      configured: available.length > 0,
      active_provider: active,
      available_providers: available,
      models: {
        ...(config.geminiApiKey ? { gemini: config.geminiModel } : {}),
        ...(config.openRouterApiKey ? { openrouter: config.openRouterModel } : {}),
        ...(config.huggingFaceApiKey ? { huggingface: config.huggingFaceModel } : {}),
      },
      rate_limit_per_minute: config.rateLimitPerMinute,
      max_output_tokens: config.maxOutputTokens,
      max_context_chars: config.maxContextChars,
      server_provider: config.provider,
    },
  };
}
