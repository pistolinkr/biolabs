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
import { AiRequestError } from "@/lib/ai/userErrors";

const CHAT_URL = "/api/ai/chat";
const STATUS_URL = "/api/ai/status";

export async function fetchAiStatus(): Promise<AiStatusResponse> {
  const res = await fetch(STATUS_URL, { cache: "no-store" });
  const data = (await res.json()) as AiStatusResponse | AiUserErrorPayload;
  if (!res.ok || !("configured" in data)) {
    const payload = data as AiUserErrorPayload;
    throw new AiRequestError(payload.code ?? "AI_UNKNOWN", payload.error ?? "AI status unavailable.");
  }
  return data;
}

export async function sendAiChat(params: {
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

  const data = (await res.json()) as AiChatResponse | AiUserErrorPayload;

  if (!res.ok || !("message" in data)) {
    const payload = data as AiUserErrorPayload;
    throw new AiRequestError(
      payload.code ?? "AI_UNKNOWN",
      payload.error ?? "AI request failed.",
    );
  }

  return data;
}
