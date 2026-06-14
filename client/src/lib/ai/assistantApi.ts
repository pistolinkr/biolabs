import type {
  AiChatMessage,
  AiChatRequest,
  AiChatResponse,
  AiExplainIntent,
  AiPlatformContext,
  AiProviderId,
} from "@shared/ai/types";
import { buildPromptMessages } from "@shared/ai/promptBuilder";
import { hasAnyClientKey, type AiClientApiKeys } from "@/lib/ai/aiKeysStorage";
import {
  CLIENT_MAX_CONTEXT_CHARS,
  CLIENT_MAX_OUTPUT_TOKENS,
  ClientProviderError,
  completeWithClientKeys,
} from "@/lib/ai/clientProviders";
import { AiRequestError } from "@/lib/ai/userErrors";

/**
 * Send an assistant chat using API keys the user entered in Settings → AI.
 * Calls go directly from the browser to the provider — no server .env required.
 */
export async function sendAiChat(params: {
  messages: AiChatMessage[];
  context: AiPlatformContext;
  intent?: AiExplainIntent;
  provider?: AiProviderId;
  generation?: AiChatRequest["generation"];
  clientKeys: AiClientApiKeys;
}): Promise<AiChatResponse> {
  if (!hasAnyClientKey(params.clientKeys)) {
    throw new AiRequestError(
      "AI_NOT_CONFIGURED",
      "Add at least one provider API key in Settings → AI Assistant.",
    );
  }

  const intent = params.intent ?? "general";
  const temperature =
    typeof params.generation?.temperature === "number"
      ? Math.min(1, Math.max(0, params.generation.temperature))
      : 0.35;
  const maxOutputTokens =
    typeof params.generation?.maxOutputTokens === "number"
      ? Math.min(CLIENT_MAX_OUTPUT_TOKENS, Math.max(128, Math.floor(params.generation.maxOutputTokens)))
      : CLIENT_MAX_OUTPUT_TOKENS;

  const promptMessages = buildPromptMessages(
    params.context,
    params.messages,
    intent,
    CLIENT_MAX_CONTEXT_CHARS,
    params.generation,
  );

  try {
    const result = await completeWithClientKeys({
      messages: promptMessages,
      keys: params.clientKeys,
      preferred: params.provider,
      maxOutputTokens,
      temperature,
    });
    return {
      message: result.text,
      provider: result.provider,
      model: result.model,
      context_fingerprint: params.context.context_fingerprint,
      fell_back: result.fellBack,
    };
  } catch (e) {
    if (e instanceof ClientProviderError) {
      throw new AiRequestError(e.code, e.message);
    }
    throw new AiRequestError("AI_UNKNOWN", e instanceof Error ? e.message : "AI request failed.");
  }
}
