import type { AiProviderId } from "@shared/ai/types";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const DEFAULT_HF_MODEL = "HuggingFaceH4/zephyr-7b-beta";

/** Strip inline comments and invalid example text from .env values. */
function cleanEnvValue(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withoutComment = trimmed.split("#")[0]?.trim() ?? "";
  return withoutComment || null;
}

function readProvider(): AiProviderId {
  const raw = cleanEnvValue(process.env.AI_PROVIDER)?.toLowerCase() ?? "auto";
  if (raw === "gemini" || raw === "openrouter" || raw === "huggingface" || raw === "auto") {
    return raw;
  }
  return "auto";
}

export interface AiServerConfig {
  provider: AiProviderId;
  geminiApiKey: string | null;
  geminiModel: string;
  openRouterApiKey: string | null;
  openRouterModel: string;
  huggingFaceApiKey: string | null;
  huggingFaceModel: string;
  maxContextChars: number;
  maxOutputTokens: number;
  rateLimitPerMinute: number;
}

export function loadAiConfig(): AiServerConfig {
  return {
    provider: readProvider(),
    geminiApiKey: cleanEnvValue(process.env.GEMINI_API_KEY),
    geminiModel: cleanEnvValue(process.env.GEMINI_MODEL) ?? DEFAULT_GEMINI_MODEL,
    openRouterApiKey: cleanEnvValue(process.env.OPENROUTER_API_KEY),
    openRouterModel: cleanEnvValue(process.env.OPENROUTER_MODEL) ?? DEFAULT_OPENROUTER_MODEL,
    huggingFaceApiKey: cleanEnvValue(process.env.HUGGINGFACE_API_KEY),
    huggingFaceModel: cleanEnvValue(process.env.HUGGINGFACE_MODEL) ?? DEFAULT_HF_MODEL,
    maxContextChars: Number(process.env.AI_MAX_CONTEXT_CHARS ?? 24_000),
    maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 1024),
    rateLimitPerMinute: Number(process.env.AI_RATE_LIMIT_PER_MIN ?? 20),
  };
}

export function listAvailableProviders(config: AiServerConfig): AiProviderId[] {
  const out: AiProviderId[] = [];
  if (config.geminiApiKey) out.push("gemini");
  if (config.openRouterApiKey) out.push("openrouter");
  if (config.huggingFaceApiKey) out.push("huggingface");
  return out;
}

export function resolveActiveProvider(config: AiServerConfig): AiProviderId | null {
  const available = listAvailableProviders(config);
  if (available.length === 0) return null;
  if (config.provider === "auto") return available[0] ?? null;
  return available.includes(config.provider) ? config.provider : null;
}
