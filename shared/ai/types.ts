/** Shared AI assistant contracts (client + server). */

export type AiProviderId = "gemini" | "openrouter" | "huggingface" | "auto";

export type AiExplainIntent =
  | "general"
  | "residue"
  | "chain"
  | "domain"
  | "mutation"
  | "structure"
  | "analysis"
  | "selection";

export interface AiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Flat context object injected into every AI request. */
export interface AiPlatformContext {
  protein_name: string | null;
  protein_id: string | null;
  protein_source: string | null;
  protein_label: string | null;
  chain: string | null;
  selected_chain: string | null;
  isolated_chain: string | null;
  residue_number: string | null;
  residue_name: string | null;
  residue_key: string | null;
  domain: string | null;
  mutation: string | null;
  sequence_fragment: string | null;
  full_sequences: Record<string, string> | null;
  nucleic_sequences: Record<string, string> | null;
  annotations: string | null;
  structure_summary: string | null;
  platform_generated_analysis: string | null;
  viewport_state: string | null;
  workflow_state: string | null;
  cached_search_hits: string | null;
  input_drafts: string | null;
  highlighted_region: string | null;
  metadata: Record<string, string | number | boolean | null>;
  /** ISO timestamp when context was assembled. */
  assembled_at: string;
  /** Stable fingerprint for dedup / debugging. */
  context_fingerprint: string;
}

export type AiResponseLanguage = "auto" | "en" | "ko" | "ja";

export type AiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_QUOTA_EXCEEDED"
  | "AI_MODEL_UNAVAILABLE"
  | "AI_NETWORK_ERROR"
  | "AI_ALL_PROVIDERS_FAILED"
  | "AI_REQUEST_INVALID"
  | "AI_EMPTY_RESPONSE"
  | "AI_UNKNOWN";

export interface AiUserErrorPayload {
  error: string;
  code: AiErrorCode;
}

export interface AiGenerationOptions {
  temperature?: number;
  maxOutputTokens?: number;
  responseLanguage?: AiResponseLanguage;
}

export interface AiChatRequest {
  messages: AiChatMessage[];
  context: AiPlatformContext;
  intent?: AiExplainIntent;
  /** Optional provider override (server validates). */
  provider?: AiProviderId;
  generation?: AiGenerationOptions;
}

export interface AiChatResponse {
  message: string;
  provider: AiProviderId;
  model: string;
  context_fingerprint: string;
}

export interface AiStatusResponse {
  configured: boolean;
  active_provider: AiProviderId | null;
  available_providers: AiProviderId[];
  models: Partial<Record<AiProviderId, string>>;
  rate_limit_per_minute: number;
  max_output_tokens: number;
  max_context_chars: number;
  server_provider: AiProviderId;
}
