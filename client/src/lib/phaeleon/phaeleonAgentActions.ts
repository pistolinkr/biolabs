import type {
  AgentStepResult,
  AiAction,
  AiAgentPlan,
  PhaeleonAiAction,
  PhaeleonDrugSlot,
  PhaeleonReportSectionKey,
  AgentPlanAction,
} from "@shared/ai/types";
import type { HelixDrugSlot } from "@/contexts/PhaeleonContext";
import { sanitizeDrugInput } from "@/lib/phaeleon/drugSearch";
import {
  assignDrugHit,
  runPhaeleonCommand,
  WHITELISTED_PHAELEON_AGENT_COMMANDS,
  type PhaeleonCommandHandlers,
} from "@/lib/phaeleon/phaeleonCommands";
import { PHAELEON_REPORT_SECTIONS } from "@/lib/phaeleon/reportSections";
import type { DrugSearchHit, DrugSlot } from "@/lib/phaeleon/types";
import { userFacingAgentReply } from "@/lib/ai/agentActions";

export { userFacingAgentReply };

const REPORT_SECTION_KEYS = new Set<PhaeleonReportSectionKey>([
  "emergency",
  "summary",
  "mechanism",
  "expectedEffects",
  "practicalSteps",
]);

function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function parseDrugSlot(raw: unknown): PhaeleonDrugSlot | null {
  if (raw === "drug1" || raw === "drug2" || raw === "active") return raw;
  return null;
}

function parseFixedSlot(raw: unknown): "drug1" | "drug2" | null {
  if (raw === "drug1" || raw === "drug2") return raw;
  return null;
}

function parsePhaeleonAction(raw: unknown): PhaeleonAiAction | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;

  switch (raw.type) {
    case "search_drug": {
      if (typeof raw.query !== "string" || !raw.query.trim()) return null;
      return { type: "search_drug", query: raw.query.trim() };
    }
    case "assign_drug": {
      const slot = parseDrugSlot(raw.slot);
      if (!slot) return null;
      const name = typeof raw.name === "string" ? raw.name.trim() : undefined;
      const index = typeof raw.index === "number" && Number.isFinite(raw.index) ? raw.index : undefined;
      return { type: "assign_drug", slot, name: name || undefined, index };
    }
    case "search_assign_drug": {
      if (typeof raw.query !== "string" || !raw.query.trim()) return null;
      const slot = parseDrugSlot(raw.slot) ?? "active";
      return { type: "search_assign_drug", query: raw.query.trim(), slot };
    }
    case "clear_drug": {
      const slot = parseDrugSlot(raw.slot);
      if (!slot || slot === "active") return null;
      return { type: "clear_drug", slot };
    }
    case "swap_drugs":
      return { type: "swap_drugs" };
    case "set_active_slot": {
      const slot = parseFixedSlot(raw.slot);
      if (!slot) return null;
      return { type: "set_active_slot", slot };
    }
    case "run_analysis":
      return { type: "run_analysis" };
    case "clear_session":
      return { type: "clear_session" };
    case "focus_inspector": {
      const slot = parseFixedSlot(raw.slot);
      if (!slot) return null;
      return { type: "focus_inspector", slot };
    }
    case "scroll_report": {
      const section = raw.section;
      if (typeof section !== "string" || !REPORT_SECTION_KEYS.has(section as PhaeleonReportSectionKey)) {
        return null;
      }
      return { type: "scroll_report", section: section as PhaeleonReportSectionKey };
    }
    case "command": {
      if (typeof raw.cmdId !== "string" || !WHITELISTED_PHAELEON_AGENT_COMMANDS.has(raw.cmdId)) return null;
      return { type: "command", cmdId: raw.cmdId };
    }
    default:
      return null;
  }
}

export function parsePhaeleonAgentPlan(text: string): AiAgentPlan {
  const jsonText = extractJsonObject(text);
  if (!jsonText) return { reply: text.trim(), actions: [] };

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!isRecord(parsed)) return { reply: text.trim(), actions: [] };

    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : text.trim();
    const rawActions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const actions = rawActions.map(parsePhaeleonAction).filter((a): a is PhaeleonAiAction => a !== null);
    return { reply: reply || text.trim(), actions };
  } catch {
    return { reply: text.trim(), actions: [] };
  }
}

export interface PhaeleonAgentSnapshot {
  activeSlot: HelixDrugSlot;
  drug1: DrugSlot | null;
  drug2: DrugSlot | null;
  searchQuery: string;
  searchHits: DrugSearchHit[];
  searchLoading: boolean;
  canAnalyze: boolean;
}

export interface PhaeleonAgentExecutorDeps {
  getState: () => PhaeleonAgentSnapshot;
  setSearchQuery: (q: string) => void;
  runSearch: (query?: string) => Promise<void>;
  assignDrugToSlot: (hit: DrugSearchHit, slot: HelixDrugSlot) => void;
  setActiveSlot: (slot: HelixDrugSlot) => void;
  clearDrug: (slot: HelixDrugSlot) => void;
  swapDrugs: () => void;
  setInspectorSlot: (slot: HelixDrugSlot | null) => void;
  runAnalysis: () => Promise<void>;
  clearSession: () => void;
  commandHandlers: PhaeleonCommandHandlers;
  scrollReportSection: (section: PhaeleonReportSectionKey) => boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onStepUpdate?: (steps: AgentStepResult[]) => void;
}

function resolveSlot(slot: PhaeleonDrugSlot, state: PhaeleonAgentSnapshot): HelixDrugSlot {
  if (slot === "drug1" || slot === "drug2") return slot;
  if (!state.drug1) return "drug1";
  if (!state.drug2) return "drug2";
  return state.activeSlot;
}

function pickHit(hits: DrugSearchHit[], name?: string, index = 0): DrugSearchHit | null {
  if (!hits.length) return null;
  if (name) {
    const lower = name.toLowerCase();
    const match = hits.find(
      (h) =>
        h.name.toLowerCase().includes(lower) ||
        h.genericNames.some((g) => g.toLowerCase().includes(lower)) ||
        h.brandNames.some((b) => b.toLowerCase().includes(lower)),
    );
    if (match) return match;
  }
  const idx = Math.max(0, Math.min(index, hits.length - 1));
  return hits[idx] ?? null;
}

export function waitForPairReady(
  getState: () => Pick<PhaeleonAgentSnapshot, "canAnalyze" | "drug1" | "drug2">,
  timeoutMs = 4_000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const state = getState();
      if (state.canAnalyze || (state.drug1 && state.drug2)) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 50);
    };
    window.setTimeout(tick, 0);
  });
}

export function waitForSearchHits(
  getState: () => Pick<PhaeleonAgentSnapshot, "searchLoading" | "searchHits" | "searchQuery">,
  expectedQuery: string,
  timeoutMs = 8_000,
): Promise<DrugSearchHit[]> {
  const expected = sanitizeDrugInput(expectedQuery);
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const state = getState();
      const queryMatch = sanitizeDrugInput(state.searchQuery) === expected;
      if (!state.searchLoading && queryMatch) {
        resolve(state.searchHits);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(state.searchHits);
        return;
      }
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

function actionLabel(action: PhaeleonAiAction, t: PhaeleonAgentExecutorDeps["t"]): string {
  switch (action.type) {
    case "search_drug":
      return t("agent.steps.searchDrug", { query: action.query });
    case "assign_drug":
      return t("agent.steps.assignDrug", { slot: action.slot, name: action.name ?? action.index ?? 0 });
    case "search_assign_drug":
      return t("agent.steps.searchAssignDrug", { query: action.query, slot: action.slot });
    case "clear_drug":
      return t("agent.steps.clearDrug", { slot: action.slot });
    case "swap_drugs":
      return t("agent.steps.swapDrugs");
    case "set_active_slot":
      return t("agent.steps.setActiveSlot", { slot: action.slot });
    case "run_analysis":
      return t("agent.steps.runAnalysis");
    case "clear_session":
      return t("agent.steps.clearSession");
    case "focus_inspector":
      return t("agent.steps.focusInspector", { slot: action.slot });
    case "scroll_report":
      return t("agent.steps.scrollReport", { section: action.section });
    case "command":
      return t("agent.steps.command", { cmdId: action.cmdId });
    default:
      return t("agent.steps.unknown");
  }
}

function buildInitialSteps(actions: PhaeleonAiAction[], t: PhaeleonAgentExecutorDeps["t"]): AgentStepResult[] {
  return actions.map((action, index) => ({
    index,
    action,
    status: "pending" as const,
    label: actionLabel(action, t),
  }));
}

function emitSteps(steps: AgentStepResult[], deps: PhaeleonAgentExecutorDeps) {
  deps.onStepUpdate?.([...steps]);
}

const SEARCH_INTENT =
  /(?:find|search|look\s*up|assign|load|찾|검색|불러|할당|넣|추가|입력)/i;
const ANALYZE_INTENT = /(?:analy[sz]e|interaction|ddi|상호작용|분석|평가)/i;
const SWAP_INTENT = /(?:swap|switch|바꿔|교환|스왑)/i;
const CLEAR_INTENT = /(?:clear|reset|초기화|리셋|지워)/i;
const REFUSAL_INTENT =
  /(?:cannot|can't|unable|없습니다|없어|불가|직접 찾|진행해 주세요|following|다음 중)/i;

function extractDrugQueries(text: string): string[] {
  const cleaned = text
    .replace(/(?:please|plz|해줘|해 주세요|부탁|분석|analyze|interaction|ddi|상호작용).+/gi, "")
    .trim();

  const pairPatterns = [
    /(.+?)\s+(?:and|&|\+|×|x|with|vs\.?)\s+(.+)/i,
    /(.+?)\s+(?:와|과|랑|하고)\s+(.+)/i,
  ];

  for (const pattern of pairPatterns) {
    const match = cleaned.match(pattern);
    if (match?.[1] && match[2]) {
      return [match[1].trim(), match[2].trim()].filter((q) => q.length >= 2);
    }
  }
  return [];
}

export function inferPhaeleonAgentActions(userText: string): PhaeleonAiAction[] {
  const text = userText.trim();
  if (!text) return [];

  const actions: PhaeleonAiAction[] = [];

  if (SWAP_INTENT.test(text) && /(?:drug|약|a\/b|b\/a|슬롯|slot)/i.test(text)) {
    actions.push({ type: "swap_drugs" });
    return actions;
  }

  if (CLEAR_INTENT.test(text) && /(?:session|세션|전체|all|pair|쌍)/i.test(text)) {
    actions.push({ type: "clear_session" });
    return actions;
  }

  const drugs = extractDrugQueries(text);
  if (drugs.length >= 2 && SEARCH_INTENT.test(text)) {
    actions.push({ type: "search_assign_drug", query: drugs[0], slot: "drug1" });
    actions.push({ type: "search_assign_drug", query: drugs[1], slot: "drug2" });
    if (ANALYZE_INTENT.test(text)) {
      actions.push({ type: "run_analysis" });
    }
    return actions;
  }

  if (ANALYZE_INTENT.test(text) && !SEARCH_INTENT.test(text)) {
    actions.push({ type: "run_analysis" });
    return actions;
  }

  if (/assistant\s*layout|assistant\s*레이아웃|어시스턴트\s*레이아웃/i.test(text)) {
    actions.push({ type: "command", cmdId: "phaeleon.layout.consult" });
    return actions;
  }

  if (/(?:emergency|응급)\s*(?:section|조치|섹션)?/i.test(text)) {
    actions.push({ type: "scroll_report", section: "emergency" });
    return actions;
  }

  return actions;
}

export function boostPhaeleonAgentPlan(userText: string, plan: AiAgentPlan): AiAgentPlan {
  if (plan.actions.length > 0) return plan;

  const inferred = inferPhaeleonAgentActions(userText);
  if (!inferred.length) return plan;

  const refused = REFUSAL_INTENT.test(plan.reply);
  const reply =
    refused || plan.reply.length > 280 || !extractJsonObject(plan.reply)
      ? userText.match(/[\u3131-\uD79D]/)
        ? "요청하신 Phaeleon 작업을 플랫폼에서 실행합니다."
        : "Executing your Phaeleon workstation request."
      : plan.reply;

  return { reply, actions: inferred };
}

async function executePhaeleonAction(
  action: PhaeleonAiAction,
  deps: PhaeleonAgentExecutorDeps,
): Promise<{ ok: boolean; detail?: string }> {
  const state = deps.getState();

  switch (action.type) {
    case "search_drug": {
      deps.setSearchQuery(action.query);
      await deps.runSearch(action.query);
      const hits = await waitForSearchHits(deps.getState, action.query);
      if (!hits.length) {
        return { ok: false, detail: deps.t("agent.errors.noSearchResults", { query: action.query }) };
      }
      return { ok: true, detail: `${hits.length} hits` };
    }

    case "assign_drug": {
      const slot = resolveSlot(action.slot, state);
      const hit = pickHit(state.searchHits, action.name, action.index ?? 0);
      if (!hit) {
        return { ok: false, detail: deps.t("agent.errors.noDrugHit") };
      }
      assignDrugHit(hit, slot, deps);
      return { ok: true, detail: hit.name };
    }

    case "search_assign_drug": {
      const slot = resolveSlot(action.slot, deps.getState());
      deps.setSearchQuery(action.query);
      await deps.runSearch(action.query);
      const hits = await waitForSearchHits(deps.getState, action.query);
      const hit = pickHit(hits, action.query, 0);
      if (!hit) {
        return { ok: false, detail: deps.t("agent.errors.noSearchResults", { query: action.query }) };
      }
      assignDrugHit(hit, slot, deps);
      return { ok: true, detail: hit.name };
    }

    case "clear_drug": {
      deps.clearDrug(action.slot);
      return { ok: true };
    }

    case "swap_drugs":
      deps.swapDrugs();
      return { ok: true };

    case "set_active_slot":
      deps.setActiveSlot(action.slot);
      return { ok: true };

    case "run_analysis": {
      const ready = await waitForPairReady(deps.getState);
      if (!ready) {
        return { ok: false, detail: deps.t("agent.errors.pairRequired") };
      }
      await deps.runAnalysis();
      return { ok: true };
    }

    case "clear_session":
      deps.clearSession();
      return { ok: true };

    case "focus_inspector":
      deps.setInspectorSlot(action.slot);
      return { ok: true };

    case "scroll_report": {
      const sectionId = PHAELEON_REPORT_SECTIONS[action.section];
      const ok = deps.scrollReportSection(action.section);
      return ok ? { ok: true, detail: sectionId } : { ok: false, detail: deps.t("agent.errors.reportSectionMissing") };
    }

    case "command": {
      const ok = runPhaeleonCommand(action.cmdId, deps.commandHandlers);
      if (!ok) {
        return { ok: false, detail: deps.t("agent.errors.commandNotAllowed", { cmdId: action.cmdId }) };
      }
      return { ok: true };
    }

    default:
      return { ok: false, detail: deps.t("agent.errors.unknownAction") };
  }
}

function isPhaeleonAiAction(action: AgentPlanAction): action is PhaeleonAiAction {
  switch (action.type) {
    case "search_drug":
    case "assign_drug":
    case "search_assign_drug":
    case "clear_drug":
    case "swap_drugs":
    case "set_active_slot":
    case "run_analysis":
    case "clear_session":
    case "focus_inspector":
    case "scroll_report":
      return true;
    case "command":
      return WHITELISTED_PHAELEON_AGENT_COMMANDS.has(action.cmdId);
    default:
      return false;
  }
}

export async function executePhaeleonAgentPlan(
  plan: AiAgentPlan,
  deps: PhaeleonAgentExecutorDeps,
): Promise<{ steps: AgentStepResult[] }> {
  const phaeleonActions = plan.actions.filter(isPhaeleonAiAction);

  if (!phaeleonActions.length) return { steps: [] };

  const steps = buildInitialSteps(phaeleonActions, deps.t);
  emitSteps(steps, deps);

  for (let i = 0; i < phaeleonActions.length; i += 1) {
    steps[i] = { ...steps[i], status: "running" };
    emitSteps(steps, deps);

    try {
      const result = await executePhaeleonAction(phaeleonActions[i], deps);
      steps[i] = {
        ...steps[i],
        status: result.ok ? "success" : "error",
        detail: result.detail,
      };
    } catch (e) {
      steps[i] = {
        ...steps[i],
        status: "error",
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    emitSteps(steps, deps);
  }

  return { steps };
}
