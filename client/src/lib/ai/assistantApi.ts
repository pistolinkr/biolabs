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
import {
  assertCallAllowed,
  beginCall,
  noteServerRetryAfter,
  recordCall,
  type AssertParams,
} from "@/lib/ai/callGate";

const CHAT_URL = "/api/ai/chat";
const STATUS_URL = "/api/ai/status";

async function readAiJson<T>(res: Response): Promise<T | AiUserErrorPayload> {
  const text = await res.text();
  if (!text.trim()) {
    throw new AiRequestError(
      "AI_NETWORK_ERROR",
      "Empty response from AI endpoint.",
    );
  }
  try {
    return JSON.parse(text) as T | AiUserErrorPayload;
  } catch {
    throw new AiRequestError(
      "AI_NETWORK_ERROR",
      res.ok
        ? "Invalid response from AI endpoint."
        : "AI endpoint unavailable. Run the dev server or `pnpm start` with API keys configured.",
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

  const lastUser = [...params.messages].reverse().find((m) => m.role === "user");
  const gateParams: AssertParams = {
    intent: params.intent ?? "general",
    contextFingerprint: params.context.context_fingerprint,
    prompt: lastUser?.content ?? "",
  };

  // Client gate: blocks UI spam / duplicates before touching the network.
  assertCallAllowed(gateParams);
  const release = beginCall();

  try {
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await readAiJson<AiChatResponse>(res);

    if (!res.ok || !("message" in data)) {
      const payload = data as AiUserErrorPayload;
      // Sync the server's retry hint into the client cooldown.
      noteServerRetryAfter(payload.retry_after_ms);
      throw new AiRequestError(
        payload.code ?? "AI_UNKNOWN",
        payload.error ?? "AI request failed.",
        payload.retry_after_ms,
      );
    }

    recordCall(gateParams);
    return data;
  } finally {
    release();
  }
}
