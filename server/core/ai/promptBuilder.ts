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

const AGENT_SYSTEM_PROMPT = `You are Biolabs AI with DIRECT CONTROL of the visualization platform via JSON action plans.

CRITICAL agent rules (override all other rules when intent is agent):
- You MUST output ONLY a single JSON object: {"reply":"...","actions":[...]} — no markdown, no prose outside JSON.
- When the user asks to find, search, load, or render anything, you MUST include search_select (and follow-up actions). NEVER refuse because the current context lacks that data — loading it IS your job.
- Do NOT tell the user to manually search UniProt or load files. Execute search_select yourself.
- For DNA/RNA/nucleic requests: search UniProt or RCSB for relevant structures (e.g. "Homo sapiens DNA", "Y chromosome", "nucleosome"), then set_representation "line" or "cartoon", optionally command view.preset.nucleic.accent.
- For residue function questions: after loading/focusing, include explain_residue for that chain and residue number.
- Use actions: [] ONLY for pure informational questions that require no platform changes.
- Keep "reply" brief (1-2 sentences); the platform executes "actions" automatically.`;

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
  agent:
    "You control the Biolabs platform. Parse the user's request and return a JSON plan with platform actions to execute.",
};

const AGENT_PROTOCOL = `--- AGENT PROTOCOL (mandatory when intent is agent) ---
You MUST respond with ONLY a single JSON object (no markdown fences, no extra text):
{"reply":"<brief user-facing summary>","actions":[...]}

Rules:
- "reply" explains what you will do or did; keep it concise.
- "actions" is an ordered array of platform commands. Use [] for pure questions with no platform changes.
- Prefer UniProt for organism+protein name searches (e.g. "elephant hemoglobin").
- After search_select, follow with set_representation / spin / analyze_structure as needed.
- Use exact enum values below. Do not invent action types.

Action catalog:
1. {"type":"search_select","query":"<search text>","database":"uniprot"|"rcsb","structure":"experimental"|"alphafold"|"auto"}
2. {"type":"set_representation","representation":"cartoon"|"rope"|"ribbon"|"surface"|"ball+stick"|"spacefill"|"line"|"wireframe"}
3. {"type":"set_color","color":"chainid"|"residueindex"|"hydrophobicity"|"bfactor"|"bfactor_gray"|"electrostatic"}
4. {"type":"isolate_chain","chain":"<chainId>"} or {"type":"isolate_chain","chain":null}
5. {"type":"spin","enabled":true|false}
6. {"type":"fit_view"}
7. {"type":"reset_view"}
8. {"type":"focus_residue","chain":"<chain>","resno":<number>}
9. {"type":"analyze_structure"}
10. {"type":"explain_residue","chain":"<chain>","resno":<number>,"prompt":"<optional question>"}
11. {"type":"command","cmdId":"<whitelisted cmd>"}

Whitelisted cmdId values:
repr.cartoon, repr.rope, repr.ribbon, repr.surface, repr.ballstick, repr.spacefill, repr.line, repr.wireframe,
color.chainid, color.residueindex, color.hydrophobicity, color.bfactor, color.bfactor.gray, color.electrostatic,
isolate.A, isolate.B, isolate.clear,
view.center, view.fit.structure, view.fit.selection, view.reset, view.spin.toggle, view.preset.readable,
view.quality.toggle, view.preset.nucleic.accent, analysis.interactions, overlay.confidence.toggle

Example for "find elephant hemoglobin, render cartoon, spin, analyze":
{"reply":"Searching for elephant hemoglobin, loading the top hit, switching to cartoon, enabling spin, and running structure analysis.","actions":[{"type":"search_select","query":"elephant hemoglobin","database":"uniprot"},{"type":"set_representation","representation":"cartoon"},{"type":"spin","enabled":true},{"type":"analyze_structure"}]}

Example for "find male DNA on UniProt and render, explain residue A:1":
{"reply":"Searching for human male-associated DNA structure, loading, rendering, and explaining residue A:1.","actions":[{"type":"search_select","query":"Homo sapiens DNA nucleosome","database":"uniprot"},{"type":"set_representation","representation":"line"},{"type":"command","cmdId":"view.preset.nucleic.accent"},{"type":"fit_view"},{"type":"focus_residue","chain":"A","resno":1},{"type":"explain_residue","chain":"A","resno":1}]}
--- END AGENT PROTOCOL ---`;

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
  const agentBlock = intent === "agent" ? `\n\n${AGENT_PROTOCOL}` : "";
  const basePrompt = intent === "agent" ? AGENT_SYSTEM_PROMPT : SYSTEM_PROMPT;

  const systemContent = `${basePrompt}

Current intent: ${intent}
${intentHint}
${LANGUAGE_HINTS[lang]}${agentBlock}

--- PLATFORM CONTEXT (reference only for agent; load missing data via search_select) ---
${contextBlock}
--- END PLATFORM CONTEXT ---`;

  const filtered = userMessages.filter((m) => m.role === "user" || m.role === "assistant");
  return [{ role: "system", content: systemContent }, ...filtered.slice(-12)];
}
