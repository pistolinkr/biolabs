import type { AiChatMessage, AiProviderId } from "@shared/ai/types";
import { loadAiConfig, resolveActiveProvider } from "./config.ts";
import { createGeminiProvider } from "./providers/gemini.ts";
import { createHuggingFaceProvider } from "./providers/huggingface.ts";
import { createOpenRouterProvider } from "./providers/openrouter.ts";
import { AiProviderError, type AiCompletionOptions, type AiProvider, type AiProviderResult } from "./providers/base.ts";
import { providerFailureLog } from "./userErrors.ts";

const PREFERRED_ORDER: AiProviderId[] = ["openrouter", "gemini", "huggingface"];

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

export async function completeWithProvider(
  messages: AiChatMessage[],
  completion: AiCompletionOptions,
  preferred?: AiProviderId,
): Promise<AiProviderResult> {
  const config = loadAiConfig();
  const providers = buildProviders(config);
  const configured = providers.filter((p) => p.isConfigured());

  if (configured.length === 0) {
    throw new AiProviderError("no providers configured", "auto");
  }

  let order: AiProviderId[];
  if (preferred && preferred !== "auto") {
    order = [preferred, ...PREFERRED_ORDER.filter((id) => id !== preferred)];
  } else if (config.provider !== "auto") {
    order = [config.provider, ...PREFERRED_ORDER.filter((id) => id !== config.provider)];
  } else {
    order = PREFERRED_ORDER;
  }

  for (const id of order) {
    const provider = configured.find((p) => p.id === id);
    if (!provider) continue;
    try {
      return await provider.complete(messages, completion);
    } catch (e) {
      providerFailureLog(id, e);
    }
  }

  throw new AiProviderError("all providers failed", resolveActiveProvider(config) ?? "auto");
}
