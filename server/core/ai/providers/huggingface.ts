import type { AiChatMessage } from "@shared/ai/types";
import type { AiServerConfig } from "../config.ts";
import { AiProviderError, type AiCompletionOptions, type AiProvider, type AiProviderResult } from "./base.ts";

const HF_TIMEOUT_MS = 45_000;

export function createHuggingFaceProvider(config: AiServerConfig): AiProvider {
  return {
    id: "huggingface",
    isConfigured: () => Boolean(config.huggingFaceApiKey),
    async complete(messages: AiChatMessage[], options: AiCompletionOptions): Promise<AiProviderResult> {
      if (!config.huggingFaceApiKey) {
        throw new AiProviderError("missing api key", "huggingface");
      }

      const prompt = messages
        .map((m) => {
          const label = m.role === "assistant" ? "Assistant" : m.role === "system" ? "System" : "User";
          return `${label}:\n${m.content}`;
        })
        .join("\n\n");

      const url = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(config.huggingFaceModel)}`;

      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), HF_TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.huggingFaceApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: `${prompt}\n\nAssistant:`,
            parameters: {
              max_new_tokens: Math.min(options.maxOutputTokens, 512),
              temperature: options.temperature,
              return_full_text: false,
            },
          }),
          signal: ac.signal,
        });
      } catch (e) {
        clearTimeout(timer);
        console.error("[biolabs-ai] huggingface network", e);
        throw new AiProviderError("huggingface network error", "huggingface");
      }
      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("[biolabs-ai] huggingface upstream", res.status, errText.slice(0, 500));
        throw new AiProviderError("huggingface upstream error", "huggingface", res.status);
      }

      const data = (await res.json()) as
        | Array<{ generated_text?: string }>
        | { error?: string; estimated_time?: number };

      if (!Array.isArray(data)) {
        console.error("[biolabs-ai] huggingface payload error", data);
        throw new AiProviderError("huggingface payload error", "huggingface");
      }

      const text = data[0]?.generated_text?.trim() ?? "";
      if (!text) {
        throw new AiProviderError("empty response", "huggingface");
      }

      return { text, model: config.huggingFaceModel, provider: "huggingface" };
    },
  };
}
