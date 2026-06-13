import type { AiAttempt, AiChatMessage, AiProviderId } from "@shared/ai/types";
import { loadAiConfig, modelsForProvider, resolveActiveProvider, type AiServerConfig } from "./config.ts";
import { createGeminiProvider } from "./providers/gemini.ts";
import { createHuggingFaceProvider } from "./providers/huggingface.ts";
import { createOpenRouterProvider } from "./providers/openrouter.ts";
import {
  AiProviderError,
  type AiCompletionOptions,
  type AiProvider,
  type AiProviderResult,
} from "./providers/base.ts";
import {
  codeForError,
  isRetryableAiCode,
  isTransientAiCode,
  providerFailureLog,
} from "./userErrors.ts";
import { isInCooldown, markFailure, markSuccess } from "./providerHealth.ts";

const PREFERRED_ORDER: AiProviderId[] = ["openrouter", "gemini", "huggingface"];

export interface AiRoutedResult extends AiProviderResult {
  attempts: AiAttempt[];
  fellBack: boolean;
}

interface Candidate {
  provider: AiProvider;
  model: string;
  /** Index of this provider in the resolved provider order (for fall-back detection). */
  providerRank: number;
}

function buildProviders(config = loadAiConfig()): AiProvider[] {
  return [
    createGeminiProvider(config),
    createOpenRouterProvider(config),
    createHuggingFaceProvider(config),
  ];
}

export function getProviderById(id: AiProviderId, config = loadAiConfig()): AiProvider | null {
  if (id === "auto") return null;
  return buildProviders(config).find((p) => p.id === id && p.isConfigured()) ?? null;
}

function resolveOrder(config: AiServerConfig, preferred?: AiProviderId): AiProviderId[] {
  if (preferred && preferred !== "auto") {
    return [preferred, ...PREFERRED_ORDER.filter((id) => id !== preferred)];
  }
  if (config.provider !== "auto") {
    return [config.provider, ...PREFERRED_ORDER.filter((id) => id !== config.provider)];
  }
  return PREFERRED_ORDER;
}

/** Flatten the provider order × per-provider model chain into ordered candidates. */
function buildCandidates(
  configured: AiProvider[],
  order: AiProviderId[],
  config: AiServerConfig,
): Candidate[] {
  const candidates: Candidate[] = [];
  order.forEach((id, providerRank) => {
    const provider = configured.find((p) => p.id === id);
    if (!provider) return;
    for (const model of modelsForProvider(config, id)) {
      candidates.push({ provider, model, providerRank });
    }
  });
  return candidates;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Run a chat completion with automatic model + provider fallback.
 */
export async function completeWithProvider(
  messages: AiChatMessage[],
  completion: AiCompletionOptions,
  preferred?: AiProviderId,
): Promise<AiRoutedResult> {
  const config = loadAiConfig();
  const configured = buildProviders(config).filter((p) => p.isConfigured());

  if (configured.length === 0) {
    throw new AiProviderError("no providers configured", "auto");
  }

  const order = resolveOrder(config, preferred).filter((id) =>
    configured.some((p) => p.id === id),
  );
  const candidates = buildCandidates(configured, order, config);
  if (candidates.length === 0) {
    throw new AiProviderError("no providers configured", "auto");
  }

  const attempts: AiAttempt[] = [];
  const deferred: Candidate[] = [];
  let lastError: unknown = null;

  const runCandidate = async (cand: Candidate): Promise<AiRoutedResult | null> => {
    const id = cand.provider.id;
    for (let retry = 0; retry <= config.retryPerModel; retry += 1) {
      try {
        const result = await cand.provider.complete(messages, { ...completion, model: cand.model });
        markSuccess(id);
        attempts.push({ provider: id, model: cand.model, ok: true });
        return { ...result, attempts, fellBack: cand.providerRank > 0 || attempts.length > 1 };
      } catch (e) {
        lastError = e;
        const code = codeForError(e);

        if (!isRetryableAiCode(code)) {
          attempts.push({ provider: id, model: cand.model, code });
          throw e;
        }

        if (isTransientAiCode(code) && retry < config.retryPerModel) {
          providerFailureLog(id, e);
          await sleep(250 * 2 ** retry);
          continue;
        }

        const retryAfterMs = e instanceof AiProviderError ? e.retryAfterMs : undefined;
        markFailure(id, code, config, retryAfterMs);
        providerFailureLog(id, e);
        attempts.push({ provider: id, model: cand.model, code });
        return null;
      }
    }
    return null;
  };

  for (const cand of candidates) {
    const id = cand.provider.id;

    if (isInCooldown(id)) {
      attempts.push({ provider: id, model: cand.model, skipped: "cooldown" });
      deferred.push(cand);
      continue;
    }

    const result = await runCandidate(cand);
    if (result) return result;
  }

  for (const cand of deferred) {
    const result = await runCandidate(cand);
    if (result) return result;
  }

  if (lastError instanceof AiProviderError) throw lastError;
  throw new AiProviderError("all providers failed", resolveActiveProvider(config) ?? "auto");
}
