import type {
  AiChatMessage,
  AiExplainIntent,
  AiGenerationOptions,
  AiPlatformContext,
  AiResponseLanguage,
} from "@shared/ai/types";

const SYSTEM_PROMPT = `You are Biolabs AI, an expert computational biology research assistant embedded in a protein structure visualization platform.

Rules:
- ALWAYS ground answers in the structured platform context provided below. Never invent PDB IDs, residue numbers, or chain IDs not present in context.
- If context is missing for a detail, say what is unknown and suggest what the user could select or load in the platform.
- Explain structures, residues, chains, domains, mutations, mechanisms, interactions, and amino acids clearly for researchers.
- When platform_generated_analysis is present, interpret and explain those computed results.
- Use concise paragraphs; bullet lists when comparing multiple chains or contacts.
- Do not claim wet-lab validation or clinical certainty unless explicitly supported by context.`;

const INTENT_HINTS: Record<AiExplainIntent, string> = {
  general: "Answer the user's question using all available platform context.",
  residue:
    "Focus on the selected residue: chemistry, role in structure, local environment, and contacts from platform analysis.",
  chain: "Focus on the selected or isolated chain: composition, length, entity type, and functional context.",
  domain: "Explain the indicated domain region and its structural/functional significance.",
  mutation: "Explain the mutation in structural and functional terms using any variant data in context.",
  structure: "Summarize the overall fold, quaternary assembly, and key structural features.",
  analysis: "Explain platform-computed proximity, contact, and polymer context results in plain language.",
  selection: "Explain what is currently selected/highlighted and why it matters biologically.",
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 20)}\n… [truncated ${text.length - max + 20} chars]`;
}

export function serializeContext(context: AiPlatformContext, maxChars: number): string {
  const lines: string[] = [
    `protein_name: ${context.protein_name ?? "none"}`,
    `protein_id: ${context.protein_id ?? "none"}`,
    `protein_source: ${context.protein_source ?? "none"}`,
    `protein_label: ${context.protein_label ?? "none"}`,
    `chain: ${context.chain ?? "none"}`,
    `selected_chain: ${context.selected_chain ?? "none"}`,
    `isolated_chain: ${context.isolated_chain ?? "none"}`,
    `residue_number: ${context.residue_number ?? "none"}`,
    `residue_name: ${context.residue_name ?? "none"}`,
    `residue_key: ${context.residue_key ?? "none"}`,
    `domain: ${context.domain ?? "none"}`,
    `mutation: ${context.mutation ?? "none"}`,
    `sequence_fragment: ${context.sequence_fragment ?? "none"}`,
    `full_sequences: ${context.full_sequences ? JSON.stringify(context.full_sequences) : "none"}`,
    `nucleic_sequences: ${context.nucleic_sequences ? JSON.stringify(context.nucleic_sequences) : "none"}`,
    `annotations: ${context.annotations ?? "none"}`,
    `structure_summary: ${context.structure_summary ?? "none"}`,
    `platform_generated_analysis: ${context.platform_generated_analysis ?? "none"}`,
    `viewport_state: ${context.viewport_state ?? "none"}`,
    `workflow_state: ${context.workflow_state ?? "none"}`,
    `cached_search_hits: ${context.cached_search_hits ?? "none"}`,
    `input_drafts: ${context.input_drafts ?? "none"}`,
    `highlighted_region: ${context.highlighted_region ?? "none"}`,
    `metadata: ${JSON.stringify(context.metadata)}`,
    `assembled_at: ${context.assembled_at}`,
    `context_fingerprint: ${context.context_fingerprint}`,
  ];
  return truncate(lines.join("\n"), maxChars);
}

const LANGUAGE_HINTS: Record<AiResponseLanguage, string> = {
  auto: "Respond in the same language the user writes in.",
  en: "Respond in English.",
  ko: "Respond in Korean (한국어).",
  ja: "Respond in Japanese (日本語).",
};

export function buildPromptMessages(
  context: AiPlatformContext,
  userMessages: AiChatMessage[],
  intent: AiExplainIntent,
  maxContextChars: number,
  generation?: AiGenerationOptions,
): AiChatMessage[] {
  const contextBlock = serializeContext(context, maxContextChars);
  const intentHint = INTENT_HINTS[intent] ?? INTENT_HINTS.general;
  const lang = generation?.responseLanguage ?? "auto";

  const systemContent = `${SYSTEM_PROMPT}

Current intent: ${intent}
${intentHint}
${LANGUAGE_HINTS[lang]}

--- PLATFORM CONTEXT (authoritative; do not ignore) ---
${contextBlock}
--- END PLATFORM CONTEXT ---`;

  const filtered = userMessages.filter((m) => m.role === "user" || m.role === "assistant");
  return [{ role: "system", content: systemContent }, ...filtered.slice(-12)];
}
