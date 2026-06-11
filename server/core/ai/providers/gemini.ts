import type { AiChatMessage } from "@shared/ai/types";
import type { AiServerConfig } from "../config.ts";
import { AiProviderError, type AiCompletionOptions, type AiProvider, type AiProviderResult } from "./base.ts";

export function createGeminiProvider(config: AiServerConfig): AiProvider {
  return {
    id: "gemini",
    isConfigured: () => Boolean(config.geminiApiKey),
    async complete(messages: AiChatMessage[], options: AiCompletionOptions): Promise<AiProviderResult> {
      if (!config.geminiApiKey) {
        throw new AiProviderError("GEMINI_API_KEY is not configured", "gemini");
      }

      const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
      const convo = messages.filter((m) => m.role !== "system");

      const contents = convo.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: systemParts.length
            ? { parts: [{ text: systemParts.join("\n\n") }] }
            : undefined,
          contents,
          generationConfig: {
            maxOutputTokens: options.maxOutputTokens,
            temperature: options.temperature,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("[biolabs-ai] gemini upstream", res.status, errText.slice(0, 500));
        throw new AiProviderError("gemini upstream error", "gemini", res.status);
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { message?: string };
      };

      if (data.error?.message) {
        console.error("[biolabs-ai] gemini payload error", data.error.message);
        throw new AiProviderError("gemini payload error", "gemini");
      }

      const text =
        data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("")?.trim() ?? "";

      if (!text) {
        throw new AiProviderError("empty response", "gemini");
      }

      return { text, model: config.geminiModel, provider: "gemini" };
    },
  };
}
