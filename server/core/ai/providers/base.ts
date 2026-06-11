import type { AiChatMessage, AiProviderId } from "@shared/ai/types";

export interface AiCompletionOptions {
  maxOutputTokens: number;
  temperature: number;
}

export interface AiProviderResult {
  text: string;
  model: string;
  provider: AiProviderId;
}

export interface AiProvider {
  id: AiProviderId;
  isConfigured(): boolean;
  complete(messages: AiChatMessage[], options: AiCompletionOptions): Promise<AiProviderResult>;
}

export class AiProviderError extends Error {
  provider: AiProviderId;
  statusCode?: number;

  constructor(message: string, provider: AiProviderId, statusCode?: number) {
    super(message);
    this.name = "AiProviderError";
    this.provider = provider;
    this.statusCode = statusCode;
  }
}
