import type {
  AiChatMessage,
  AiChatRequest,
  AiChatResponse,
  AiExplainIntent,
  AiPlatformContext,
  AiProviderId,
  AiStatusResponse,
  AiUserErrorPayload,
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

const CHAT_URL = "/api/ai/chat";
const STATUS_URL = "/api/ai/status";

export type AiTransportMode = "server" | "client";

async function readAiJson<T>(res: Response): Promise<T | AiUserErrorPayload> {
  const text = await res.text();
  if (!text.trim()) {
    throw new AiRequestError("AI_NETWORK_ERROR", "Empty response from AI endpoint.");
  }
  try {
    return JSON.parse(text) as T | AiUserErrorPayload;
  } catch {
    throw new AiRequestError(
      "AI_NETWORK_ERROR",
      res.ok
        ? "Invalid response from AI endpoint."
        : "AI endpoint unavailable. Add your API keys in Settings → AI, or run the server with .env keys.",
    );
  }
}

export async function fetchAiStatus(): Promise<AiStatusResponse> {
  const res = await fetch(STATUS_URL, { cache: "no-store" });
  const data = await readAiJson<AiStatusResponse>(res);
  if (!res.ok || !("configured" in data)) {
    const payload = data as AiUserErrorPayload;
    throw new AiRequestError(payload.code ?? "AI_UNKNOWN", payload.error ?? "AI status unavailable.");
  }
  return data;
}

function canUseClientTransport(clientKeys?: AiClientApiKeys): boolean {
  return Boolean(clientKeys && hasAnyClientKey(clientKeys));
}

function shouldFallbackTransport(err: unknown): boolean {
  if (!(err instanceof AiRequestError)) return true;
  return err.code !== "AI_REQUEST_INVALID";
}

function toAiRequestError(err: unknown): AiRequestError {
  if (err instanceof AiRequestError) return err;
  return new AiRequestError("AI_UNKNOWN", err instanceof Error ? err.message : "AI request failed.");
}

async function sendAiChatServer(params: {
  messages: AiChatMessage[];
  context: AiPlatformContext;
  intent?: AiExplainIntent;
  provider?: AiProviderId;
  generation?: AiChatRequest["generation"];
}): Promise<AiChatResponse> {
  const body: AiChatRequest = {
    messages: params.messages,
    context: params.context,
    intent: params.intent,
    provider: params.provider,
    generation: params.generation,
  };

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await readAiJson<AiChatResponse>(res);

  if (!res.ok || !("message" in data)) {
    const payload = data as AiUserErrorPayload;
    throw new AiRequestError(payload.code ?? "AI_UNKNOWN", payload.error ?? "AI request failed.");
  }

  return data;
}

async function sendAiChatClient(params: {
  messages: AiChatMessage[];
  context: AiPlatformContext;
  intent?: AiExplainIntent;
  provider?: AiProviderId;
  generation?: AiChatRequest["generation"];
  clientKeys: AiClientApiKeys;
}): Promise<AiChatResponse> {
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

/**
 * Route AI chat with dual credential sources.
 * When the server has .env keys, those are tried first (reliable failover, no browser CORS).
 * Browser keys are used when the server is unavailable or as a fallback after server failure.
 */
export async function sendAiChat(params: {
  messages: AiChatMessage[];
  context: AiPlatformContext;
  intent?: AiExplainIntent;
  provider?: AiProviderId;
  generation?: AiChatRequest["generation"];
  clientKeys?: AiClientApiKeys;
  /** True when GET /api/ai/status reported configured providers. */
  serverConfigured?: boolean;
  /** @deprecated Prefer serverConfigured + clientKeys. Kept for callers that still pass transport. */
  transport?: AiTransportMode;
}): Promise<AiChatResponse> {
  const canClient = canUseClientTransport(params.clientKeys);
  const serverOk = params.serverConfigured === true;
  const errors: AiRequestError[] = [];

  const tryServer = async (): Promise<AiChatResponse | null> => {
    try {
      return await sendAiChatServer(params);
    } catch (e) {
      const err = toAiRequestError(e);
      errors.push(err);
      return null;
    }
  };

  const tryClient = async (): Promise<AiChatResponse | null> => {
    if (!canClient) return null;
    try {
      return await sendAiChatClient({ ...params, clientKeys: params.clientKeys! });
    } catch (e) {
      const err = toAiRequestError(e);
      errors.push(err);
      return null;
    }
  };

  // Legacy explicit client-only preference (static hosting with no server status).
  const forceClient = params.transport === "client" && canClient && !serverOk;

  if (forceClient) {
    const clientResponse = await tryClient();
    if (clientResponse) return clientResponse;
    const serverResponse = await tryServer();
    if (serverResponse) return { ...serverResponse, fell_back: true };
  } else if (serverOk) {
    const serverResponse = await tryServer();
    if (serverResponse) return serverResponse;

    const lastServerErr = errors[errors.length - 1];
    if (canClient && lastServerErr && shouldFallbackTransport(lastServerErr)) {
      const clientResponse = await tryClient();
      if (clientResponse) return { ...clientResponse, fell_back: true };
    }
  } else if (canClient) {
    const clientResponse = await tryClient();
    if (clientResponse) return clientResponse;

    const lastClientErr = errors[errors.length - 1];
    if (lastClientErr && shouldFallbackTransport(lastClientErr)) {
      const serverResponse = await tryServer();
      if (serverResponse) return { ...serverResponse, fell_back: true };
    }
  } else {
    const serverResponse = await tryServer();
    if (serverResponse) return serverResponse;
  }

  throw errors[errors.length - 1] ?? new AiRequestError("AI_NOT_CONFIGURED", "AI is not configured.");
}
