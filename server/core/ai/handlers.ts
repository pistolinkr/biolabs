import type {
  AiChatRequest,
  AiChatResponse,
  AiExplainIntent,
  AiPlatformContext,
  AiProviderHealth,
  AiProviderId,
  AiStatusResponse,
} from "@shared/ai/types";
import {
  listAvailableProviders,
  loadAiConfig,
  modelsForProvider,
  resolveActiveProvider,
} from "./config.ts";
import { buildPromptMessages } from "./promptBuilder.ts";
import { completeWithProvider } from "./providerRouter.ts";
import { cooldownUntil } from "./providerHealth.ts";
import { usageSnapshot } from "./usageLimiter.ts";
import {
  acquireSlot,
  callBudgetSnapshot,
  checkCallPolicy,
  recordCallPolicy,
  releaseSlot,
  type CallBlockReason,
} from "./callPolicy.ts";
import {
  invalidRequest,
  rateLimited,
  sanitizeAiError,
  type AiErrorCode,
  type AiUserErrorPayload,
} from "./userErrors.ts";

const BLOCK_REASON_CODE: Record<CallBlockReason, AiErrorCode> = {
  rpm: "AI_RATE_LIMITED",
  daily: "AI_DAILY_BUDGET_EXCEEDED",
  concurrency: "AI_CONCURRENCY_LIMIT",
};

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
    v === "selection" ||
    v === "agent"
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

  // Global intent-weighted budget gate (above per-provider usageLimiter).
  const policy = checkCallPolicy(intent, config);
  if (!policy.ok && policy.reason) {
    return {
      status: 429,
      json: rateLimited(BLOCK_REASON_CODE[policy.reason], policy.retryAfterMs),
    };
  }

  if (!acquireSlot(config)) {
    return { status: 429, json: rateLimited("AI_CONCURRENCY_LIMIT") };
  }

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

    // Only successful upstream calls count against the global budget.
    recordCallPolicy(intent, config);

    const response: AiChatResponse = {
      message: result.text,
      provider: result.provider,
      model: result.model,
      context_fingerprint: req.context.context_fingerprint,
      attempts: result.attempts,
      fell_back: result.fellBack,
    };

    return { status: 200, json: response };
  } catch (e) {
    return { status: 502, json: sanitizeAiError(e) };
  } finally {
    releaseSlot();
  }
}

export function handleAiStatus(): { status: number; json: AiStatusResponse } {
  const config = loadAiConfig();
  const available = listAvailableProviders(config);
  const active = resolveActiveProvider(config);

  const modelChains: Partial<Record<AiProviderId, string[]>> = {};
  const providerHealth: AiProviderHealth[] = available.map((id) => {
    const models = modelsForProvider(config, id);
    modelChains[id] = models;
    const usage = usageSnapshot(id);
    return {
      id,
      models,
      cooldown_until: cooldownUntil(id),
      requests_last_minute: usage.requests_last_minute,
      requests_today: usage.requests_today,
      rpm_limit: config.providerRpm,
      daily_limit: config.providerDailyLimit,
    };
  });

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
      model_chains: modelChains,
      provider_health: providerHealth,
      call_budget: callBudgetSnapshot(config),
    },
  };
}
