import type { AiChatMessage } from "@shared/ai/types";
import type { AiServerConfig } from "../config.ts";
import { appendTruncationNotice } from "../truncation.ts";
import {
  AiProviderError,
  parseRetryAfterMs,
  type AiCompletionOptions,
  type AiProvider,
  type AiProviderResult,
} from "./base.ts";

export function createOpenRouterProvider(config: AiServerConfig): AiProvider {
  return {
    id: "openrouter",
    isConfigured: () => Boolean(config.openRouterApiKey),
    async complete(messages: AiChatMessage[], options: AiCompletionOptions): Promise<AiProviderResult> {
      if (!config.openRouterApiKey) {
        throw new AiProviderError("OPENROUTER_API_KEY is not configured", "openrouter");
      }

      const model = options.model ?? config.openRouterModel;
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://biolabs.local",
          "X-Title": "Biolabs Protein Workstation",
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: options.maxOutputTokens,
          temperature: options.temperature,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("[biolabs-ai] openrouter upstream", res.status, errText.slice(0, 500));
        throw new AiProviderError("openrouter upstream error", "openrouter", res.status, {
          retryAfterMs: parseRetryAfterMs(res),
          model,
        });
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
        error?: { message?: string };
      };

      if (data.error?.message) {
        console.error("[biolabs-ai] openrouter payload error", data.error.message);
        throw new AiProviderError("openrouter payload error", "openrouter", undefined, { model });
      }

      const choice = data.choices?.[0];
      const text = choice?.message?.content?.trim() ?? "";
      if (!text) {
        throw new AiProviderError("empty response", "openrouter", undefined, { model });
      }

      const truncated = choice?.finish_reason === "length";
      return {
        text: appendTruncationNotice(text, truncated),
        model,
        provider: "openrouter",
      };
    },
  };
}
