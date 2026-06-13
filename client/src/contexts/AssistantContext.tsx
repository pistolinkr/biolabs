import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { i18n } from "@/i18n";
import { useViewer } from "@/contexts/ViewerContext";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { proteinSelectionKey } from "@/lib/proteinApis";
import { STRUCTURE_ANALYSIS_PROMPT } from "@/lib/ai/structureAnalysisPrompt";
import { appendStructureAnalysisHistory } from "@/lib/ai/structureAnalysisHistory";
import {
  DEFAULT_AI_CLIENT_SETTINGS,
  loadAiClientSettings,
  saveAiClientSettings,
  type AiClientSettings,
} from "@/lib/ai/aiSettingsStorage";
import {
  DEFAULT_AI_KEYS,
  hasAnyClientKey,
  loadAiKeysSettings,
  saveAiKeysSettings,
  type AiKeysSettings,
} from "@/lib/ai/aiKeysStorage";
import { buildClientAiStatus, CLIENT_MAX_OUTPUT_TOKENS } from "@/lib/ai/clientProviders";
import { buildAiPlatformContext } from "@/lib/ai/contextBuilder";
import { boostAgentPlan, executeAgentPlan, parseAgentPlan } from "@/lib/ai/agentActions";
import { acceptLanguageForSearch } from "@/lib/proteinSearchQuery";
import { fetchAiStatus, sendAiChat } from "@/lib/ai/assistantApi";
import { AiRequestError, formatAiUserNotice, noticeFromUnknownError } from "@/lib/ai/userErrors";
import type {
  AgentStepResult,
  AiChatMessage,
  AiExplainIntent,
  AiPlatformContext,
  AiProviderId,
  AiStatusResponse,
} from "@shared/ai/types";

export interface AssistantUiMessage extends AiChatMessage {
  id: string;
  pending?: boolean;
  error?: boolean;
  agentSteps?: AgentStepResult[];
  agentExecuting?: boolean;
  /** True when the answer was served by a fallback provider/model. */
  fellBack?: boolean;
  /** Provider/model that actually produced this answer. */
  servedBy?: { provider: AiProviderId; model: string };
}

interface RoutingMeta {
  fellBack: boolean;
  provider: AiProviderId;
  model: string;
}

export interface ContextExtensionSlice {
  domain?: string | null;
  mutation?: string | null;
  input_drafts?: string | null;
  annotations?: string | null;
  platform_generated_analysis?: string | null;
}

export interface StructureAnalysisActive {
  entryId: string;
  phase: "loading" | "ready" | "error";
  content: string | null;
}

export interface StructureAnalysisState {
  /** Opens the viewport analysis panel (e.g. agent or re-run). */
  panelOpen: boolean;
  active: StructureAnalysisActive | null;
}

interface AssistantContextValue {
  messages: AssistantUiMessage[];
  status: AiStatusResponse | null;
  statusLoading: boolean;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  isSending: boolean;
  lastContext: AiPlatformContext | null;
  buildContext: () => AiPlatformContext;
  sendMessage: (text: string, intent?: AiExplainIntent) => Promise<void>;
  runAgentQuery: (text: string) => Promise<{
    ok: boolean;
    reply?: string;
    steps?: AgentStepResult[];
    error?: string;
  }>;
  explain: (params: {
    intent: AiExplainIntent;
    prompt: string;
    openChat?: boolean;
    /** When true, never opens assistant chat/history (overrides settings). */
    popoverOnly?: boolean;
    /** When false, skips the global bottom-right explain popover. */
    globalPopover?: boolean;
  }) => Promise<string | null>;
  clearMessages: () => void;
  registerContextExtension: (slice: ContextExtensionSlice) => () => void;
  /** Popover state for inline explain UI */
  explainPopover: {
    open: boolean;
    title: string;
    content: string | null;
    loading: boolean;
    intent: AiExplainIntent;
  } | null;
  closeExplainPopover: () => void;
  aiSettings: AiClientSettings;
  updateAiSettings: (patch: Partial<AiClientSettings>) => void;
  resetAiSettings: () => void;
  aiKeysSettings: AiKeysSettings;
  updateAiKeysSettings: (patch: Partial<AiKeysSettings>) => void;
  clearAiKeys: () => void;
  /** True when server or user API keys can serve requests. */
  aiConfigured: boolean;
  usingClientKeys: boolean;
  refreshAiStatus: () => Promise<void>;
  testAiConnection: () => Promise<boolean>;
  structureAnalysis: StructureAnalysisState;
  analyzeStructure: () => Promise<void>;
  closeStructureAnalysis: () => void;
}

const FALLBACK_AI_STATUS: AiStatusResponse = {
  configured: false,
  active_provider: null,
  available_providers: [],
  models: {},
  max_output_tokens: 2048,
  max_context_chars: 24000,
  server_provider: "auto",
};

function resolveAiStatus(server: AiStatusResponse | null, keys: AiKeysSettings): AiStatusResponse {
  const base = server ?? FALLBACK_AI_STATUS;
  if (!keys.useOwnApiKeys || !hasAnyClientKey(keys.keys)) {
    return base;
  }

  const client = buildClientAiStatus(keys.keys);
  if (!base.configured) {
    return client;
  }

  return {
    ...base,
    configured: true,
    active_provider: client.active_provider ?? base.active_provider,
    available_providers: Array.from(new Set([...client.available_providers, ...base.available_providers])),
    models: { ...base.models, ...client.models },
    max_output_tokens: Math.max(base.max_output_tokens, client.max_output_tokens),
    max_context_chars: Math.max(base.max_context_chars, client.max_context_chars),
  };
}

function isAiConfigured(server: AiStatusResponse | null, keys: AiKeysSettings): boolean {
  if (server?.configured) return true;
  if (keys.useOwnApiKeys && hasAnyClientKey(keys.keys)) return true;
  return false;
}

function shouldUseClientKeys(keys: AiKeysSettings): boolean {
  return keys.useOwnApiKeys && hasAnyClientKey(keys.keys);
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

let msgCounter = 0;
function nextId(): string {
  msgCounter += 1;
  return `ai-${Date.now()}-${msgCounter}`;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const viewer = useViewer();
  const workflow = useWorkflow();

  const [messages, setMessages] = useState<AssistantUiMessage[]>([]);
  const [status, setStatus] = useState<AiStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastContext, setLastContext] = useState<AiPlatformContext | null>(null);
  const [extensions, setExtensions] = useState<ContextExtensionSlice[]>([]);
  const [explainPopover, setExplainPopover] = useState<AssistantContextValue["explainPopover"]>(null);
  const [structureAnalysis, setStructureAnalysis] = useState<StructureAnalysisState>({
    panelOpen: false,
    active: null,
  });
  const [aiSettings, setAiSettings] = useState<AiClientSettings>(() => loadAiClientSettings());
  const [aiKeysSettings, setAiKeysSettings] = useState<AiKeysSettings>(() => loadAiKeysSettings());

  const viewerRef = useRef(viewer);
  const serverStatusRef = useRef<AiStatusResponse | null>(null);
  useEffect(() => {
    viewerRef.current = viewer;
  }, [viewer]);

  /** Routing trail of the most recent runChat call (for fallback UI hints). */
  const lastRoutingRef = useRef<RoutingMeta | null>(null);

  const mergedExtensions = useMemo(() => {
    const out: ContextExtensionSlice = {};
    for (const ext of extensions) {
      if (ext.domain) out.domain = ext.domain;
      if (ext.mutation) out.mutation = ext.mutation;
      if (ext.input_drafts) out.input_drafts = ext.input_drafts;
      if (ext.annotations) out.annotations = ext.annotations;
      if (ext.platform_generated_analysis) out.platform_generated_analysis = ext.platform_generated_analysis;
    }
    return out;
  }, [extensions]);

  const buildContext = useCallback((): AiPlatformContext => {
    return buildAiPlatformContext({
      proteinSelection: viewer.proteinSelection,
      structureModel: viewer.structureModel,
      selectedResidueKey: viewer.selectedResidueKey,
      viewportPickDetail: viewer.viewportPickDetail,
      isolateChainId: viewer.isolateChainId,
      hoverChainId: viewer.hoverChainId,
      polymerContextSnapshot: viewer.polymerContextSnapshot,
      representation: viewer.representation,
      colorScheme: viewer.colorScheme,
      contextContactRadiusAngstrom: viewer.contextContactRadiusAngstrom,
      polymerInteractionOverlayEnabled: viewer.polymerInteractionOverlayEnabled,
      nucleicBackboneAccentEnabled: viewer.nucleicBackboneAccentEnabled,
      renderOptions: { ...viewer.renderOptions },
      measurementMode: viewer.measurementMode,
      focusResidueQuery: viewer.focusResidueQuery,
      selectedSequencePolymerKind: viewer.selectedSequencePolymerKind,
      workflow: {
        focusedStage: workflow.focusedStage,
        stageStatuses: workflow.stageStatuses,
        contextualHint: workflow.contextualHint,
        runningJobs: workflow.runningJobs,
        queueDepth: workflow.queueDepth,
        workflowSourceSummary: workflow.workflowSourceSummary,
      },
      extensions: mergedExtensions,
      contextOptions: {
        includeFullSequences: aiSettings.includeFullSequences,
        compactContext: aiSettings.compactContext,
      },
    });
  }, [viewer, workflow, mergedExtensions, aiSettings.includeFullSequences, aiSettings.compactContext]);

  const registerContextExtension = useCallback((slice: ContextExtensionSlice) => {
    setExtensions((prev) => [...prev, slice]);
    return () => {
      setExtensions((prev) => prev.filter((s) => s !== slice));
    };
  }, []);

  const refreshAiStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      let serverStatus: AiStatusResponse | null = null;
      try {
        serverStatus = await fetchAiStatus();
      } catch {
        serverStatus = null;
      }
      serverStatusRef.current = serverStatus;
      setStatus(resolveAiStatus(serverStatus, aiKeysSettings));
    } finally {
      setStatusLoading(false);
    }
  }, [aiKeysSettings]);

  useEffect(() => {
    void refreshAiStatus();
  }, [refreshAiStatus]);

  useEffect(() => {
    setStatus(resolveAiStatus(serverStatusRef.current, aiKeysSettings));
  }, [aiKeysSettings]);

  const updateAiKeysSettings = useCallback((patch: Partial<AiKeysSettings>) => {
    setAiKeysSettings((prev) => {
      const next: AiKeysSettings = {
        ...prev,
        ...patch,
        keys: patch.keys ? { ...prev.keys, ...patch.keys } : prev.keys,
      };
      saveAiKeysSettings(next);
      setStatus(resolveAiStatus(serverStatusRef.current, next));
      return next;
    });
  }, []);

  const clearAiKeys = useCallback(() => {
    const next = { ...DEFAULT_AI_KEYS, keys: { ...DEFAULT_AI_KEYS.keys } };
    setAiKeysSettings(next);
    saveAiKeysSettings(next);
    setStatus(resolveAiStatus(serverStatusRef.current, next));
  }, []);

  const updateAiSettings = useCallback((patch: Partial<AiClientSettings>) => {
    setAiSettings((prev) => {
      const next = { ...prev, ...patch };
      saveAiClientSettings(next);
      return next;
    });
  }, []);

  const resetAiSettings = useCallback(() => {
    const next = { ...DEFAULT_AI_CLIENT_SETTINGS };
    setAiSettings(next);
    saveAiClientSettings(next);
  }, []);

  const usingClientKeys = shouldUseClientKeys(aiKeysSettings);
  const aiConfigured = isAiConfigured(status, aiKeysSettings);

  const runChat = useCallback(
    async (userText: string, intent: AiExplainIntent, history: AssistantUiMessage[]) => {
      if (!isAiConfigured(status, aiKeysSettings)) {
        toast.error(i18n.t("toasts.notConfigured", { ns: "assistant" }), {
          description: formatAiUserNotice("AI_NOT_CONFIGURED", i18n.t("toasts.notConfiguredHint", { ns: "assistant" })),
        });
        return null;
      }

      const context = buildContext();
      setLastContext(context);

      const chatHistory: AiChatMessage[] = [
        ...history
          .filter((m) => !m.pending && !m.error && (m.role === "user" || m.role === "assistant"))
          .map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userText },
      ];

      const useClient = shouldUseClientKeys(aiKeysSettings);
      const serverCap = useClient
        ? CLIENT_MAX_OUTPUT_TOKENS
        : (status?.max_output_tokens ?? aiSettings.maxOutputTokens);
      const explainIntent =
        intent !== "general" && intent !== "agent";
      const requestedTokens = explainIntent
        ? Math.max(aiSettings.maxOutputTokens, 2048)
        : aiSettings.maxOutputTokens;

      const response = await sendAiChat({
        messages: chatHistory,
        context,
        intent,
        provider: aiSettings.preferredProvider,
        generation: {
          temperature: aiSettings.temperature,
          maxOutputTokens: Math.min(requestedTokens, serverCap),
          responseLanguage: aiSettings.responseLanguage,
        },
        transport: useClient ? "client" : "server",
        clientKeys: useClient ? aiKeysSettings.keys : undefined,
      });
      lastRoutingRef.current = {
        fellBack: Boolean(response.fell_back),
        provider: response.provider,
        model: response.model,
      };
      return response.message;
    },
    [buildContext, status, aiKeysSettings, aiSettings],
  );

  const explain = useCallback(
    async ({
      intent,
      prompt,
      openChat = false,
      popoverOnly = false,
      globalPopover = true,
    }: {
      intent: AiExplainIntent;
      prompt: string;
      openChat?: boolean;
      popoverOnly?: boolean;
      globalPopover?: boolean;
    }) => {
      const shouldOpenChat = !popoverOnly && (openChat || aiSettings.autoOpenChatOnExplain);

      if (globalPopover) {
        setExplainPopover({
          open: true,
          title: intent.charAt(0).toUpperCase() + intent.slice(1),
          content: null,
          loading: true,
          intent,
        });
      }

      if (shouldOpenChat) setChatOpen(true);

      setIsSending(true);
      try {
        const answer = await runChat(prompt, intent, []);
        if (answer) {
          if (globalPopover) {
            setExplainPopover((prev) =>
              prev ? { ...prev, content: answer, loading: false } : prev,
            );
          }
          if (shouldOpenChat) {
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: "user", content: prompt },
              { id: nextId(), role: "assistant", content: answer },
            ]);
          }
        } else if (globalPopover) {
          setExplainPopover(null);
        }
        return answer;
      } catch (e) {
        const notice = e instanceof AiRequestError
          ? formatAiUserNotice(e.code, e.message)
          : noticeFromUnknownError(e);
        if (globalPopover) {
          setExplainPopover((prev) =>
            prev ? { ...prev, content: notice, loading: false } : prev,
          );
          toast.error(i18n.t("toasts.explainUnavailable", { ns: "assistant" }), { description: notice });
        }
        return globalPopover ? null : notice;
      } finally {
        setIsSending(false);
      }
    },
    [runChat, aiSettings.autoOpenChatOnExplain],
  );

  const testAiConnection = useCallback(async () => {
    if (!isAiConfigured(status, aiKeysSettings)) {
      toast.error(i18n.t("toasts.notConfigured", { ns: "assistant" }), {
        description: formatAiUserNotice("AI_NOT_CONFIGURED", i18n.t("toasts.notConfiguredHint", { ns: "assistant" })),
      });
      return false;
    }
    try {
      const context = buildContext();
      const useClient = shouldUseClientKeys(aiKeysSettings);
      await sendAiChat({
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        context,
        intent: "general",
        provider: aiSettings.preferredProvider,
        generation: {
          temperature: 0,
          maxOutputTokens: 16,
          responseLanguage: "en",
        },
        transport: useClient ? "client" : "server",
        clientKeys: useClient ? aiKeysSettings.keys : undefined,
      });
      toast.success(i18n.t("toasts.connectionOk", { ns: "assistant" }));
      return true;
    } catch (e) {
      const notice = e instanceof AiRequestError
        ? formatAiUserNotice(e.code, e.message)
        : noticeFromUnknownError(e);
      toast.error(i18n.t("toasts.connectionFailed", { ns: "assistant" }), { description: notice });
      return false;
    }
  }, [status, aiKeysSettings, buildContext, aiSettings.preferredProvider]);

  const closeStructureAnalysis = useCallback(() => {
    setStructureAnalysis((prev) => ({ ...prev, panelOpen: false }));
  }, []);

  const analyzeStructure = useCallback(async () => {
    const selection = viewer.proteinSelection;
    if (!selection || !viewer.structureModel) {
      toast.message(i18n.t("toastTitles.viewport", { ns: "viewport" }), {
        description: i18n.t("toasts.noStructure", { ns: "viewport" }),
      });
      return;
    }
    if (!isAiConfigured(status, aiKeysSettings)) {
      toast.error(i18n.t("toasts.notConfigured", { ns: "assistant" }), {
        description: formatAiUserNotice("AI_NOT_CONFIGURED", i18n.t("toasts.notConfiguredHint", { ns: "assistant" })),
      });
      return;
    }

    const proteinKey = proteinSelectionKey(selection);
    const proteinLabel =
      selection.label.length > 80 ? `${selection.label.slice(0, 77)}…` : selection.label;
    const entryId = `sa-${Date.now()}`;
    const promptLabel = i18n.t("structureAnalysis.runLabel", { ns: "assistant" });

    setStructureAnalysis({
      panelOpen: true,
      active: { entryId, phase: "loading", content: null },
    });

    const answer = await explain({
      intent: "structure",
      prompt: STRUCTURE_ANALYSIS_PROMPT,
      popoverOnly: true,
      globalPopover: false,
    });

    if (!answer) {
      const notice = formatAiUserNotice("AI_UNKNOWN", i18n.t("structureAnalysis.failed", { ns: "assistant" }));
      appendStructureAnalysisHistory(proteinKey, {
        id: entryId,
        proteinKey,
        proteinLabel,
        prompt: promptLabel,
        answer: notice,
        error: true,
        createdAt: new Date().toISOString(),
      });
      setStructureAnalysis({
        panelOpen: true,
        active: { entryId, phase: "error", content: notice },
      });
      return;
    }

    const isError = answer.includes("(AI_");
    appendStructureAnalysisHistory(proteinKey, {
      id: entryId,
      proteinKey,
      proteinLabel,
      prompt: promptLabel,
      answer,
      error: isError,
      createdAt: new Date().toISOString(),
    });
    setStructureAnalysis({
      panelOpen: true,
      active: {
        entryId,
        phase: isError ? "error" : "ready",
        content: answer,
      },
    });
  }, [
    viewer.proteinSelection,
    viewer.structureModel,
    status,
    aiKeysSettings,
    explain,
  ]);

  const runAgent = useCallback(
    async (userText: string, history: AssistantUiMessage[], pendingId: string) => {
      const raw = await runChat(userText, "agent", history);
      if (!raw) {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId));
        return;
      }
      const routing = lastRoutingRef.current;

      const plan = boostAgentPlan(userText, parseAgentPlan(raw));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                content: plan.reply,
                pending: false,
                agentExecuting: plan.actions.length > 0,
                agentSteps: plan.actions.length > 0 ? [] : undefined,
                fellBack: routing?.fellBack,
                servedBy: routing
                  ? { provider: routing.provider, model: routing.model }
                  : undefined,
              }
            : m,
        ),
      );

      if (!plan.actions.length) return;

      const uiLocale = i18n.language?.split("-")[0] ?? "en";
      const acceptLanguage = acceptLanguageForSearch(uiLocale);

      const explainResidue = async (params: { chain: string; resno: number; prompt?: string }) => {
        const prompt =
          params.prompt ??
          `Explain the biological function and structural role of residue ${params.chain}:${params.resno} in the loaded structure.`;
        return runChat(prompt, "residue", []);
      };

      try {
        const { appendReply } = await executeAgentPlan(plan, {
          getViewer: () => ({
            proteinSelection: viewerRef.current.proteinSelection,
            structureModel: viewerRef.current.structureModel,
          }),
          setProteinSelection: viewerRef.current.setProteinSelection,
          setRepresentation: viewerRef.current.setRepresentation,
          setColorScheme: viewerRef.current.setColorScheme,
          setIsolateChainId: viewerRef.current.setIsolateChainId,
          setSpinEnabled: viewerRef.current.setSpinEnabled,
          setSelectedResidueKey: viewerRef.current.setSelectedResidueKey,
          runViewerCommand: viewerRef.current.runViewerCommand,
          analyzeStructure,
          explainResidue,
          acceptLanguage,
          t: (key, opts) => i18n.t(key, { ns: "assistant", ...opts }),
          onStepUpdate: (steps) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === pendingId ? { ...m, agentSteps: steps, agentExecuting: true } : m,
              ),
            );
          },
        });

        if (appendReply) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId ? { ...m, content: `${plan.reply}\n\n${appendReply}` } : m,
            ),
          );
        }
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingId ? { ...m, agentExecuting: false } : m)),
        );
      }
    },
    [runChat, analyzeStructure],
  );

  const runAgentQuery = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return { ok: false, error: "empty" };
      if (!isAiConfigured(status, aiKeysSettings)) {
        return { ok: false, error: formatAiUserNotice("AI_NOT_CONFIGURED") };
      }

      try {
        const raw = await runChat(trimmed, "agent", []);
        if (!raw) return { ok: false, error: "no_response" };

        const plan = boostAgentPlan(trimmed, parseAgentPlan(raw));
        if (!plan.actions.length) {
          return { ok: true, reply: plan.reply, steps: [] };
        }

        const uiLocale = i18n.language?.split("-")[0] ?? "en";
        const acceptLanguage = acceptLanguageForSearch(uiLocale);
        const explainResidue = async (params: { chain: string; resno: number; prompt?: string }) => {
          const prompt =
            params.prompt ??
            `Explain the biological function and structural role of residue ${params.chain}:${params.resno} in the loaded structure.`;
          return runChat(prompt, "residue", []);
        };

        const { steps, appendReply } = await executeAgentPlan(plan, {
          getViewer: () => ({
            proteinSelection: viewerRef.current.proteinSelection,
            structureModel: viewerRef.current.structureModel,
          }),
          setProteinSelection: viewerRef.current.setProteinSelection,
          setRepresentation: viewerRef.current.setRepresentation,
          setColorScheme: viewerRef.current.setColorScheme,
          setIsolateChainId: viewerRef.current.setIsolateChainId,
          setSpinEnabled: viewerRef.current.setSpinEnabled,
          setSelectedResidueKey: viewerRef.current.setSelectedResidueKey,
          runViewerCommand: viewerRef.current.runViewerCommand,
          analyzeStructure,
          explainResidue,
          acceptLanguage,
          t: (key, opts) => i18n.t(key, { ns: "assistant", ...opts }),
        });

        const reply = appendReply ? `${plan.reply}\n\n${appendReply}` : plan.reply;
        return { ok: true, reply, steps };
      } catch (e) {
        const notice = e instanceof AiRequestError
          ? formatAiUserNotice(e.code, e.message)
          : noticeFromUnknownError(e);
        return { ok: false, error: notice };
      }
    },
    [runChat, status, aiKeysSettings, analyzeStructure],
  );

  const sendMessage = useCallback(
    async (text: string, intent: AiExplainIntent = "agent") => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const userMsg: AssistantUiMessage = { id: nextId(), role: "user", content: trimmed };
      const pendingId = nextId();
      setMessages((prev) => [...prev, userMsg, { id: pendingId, role: "assistant", content: "", pending: true }]);
      setIsSending(true);

      try {
        if (intent === "agent" || intent === "general") {
          await runAgent(trimmed, messages, pendingId);
          return;
        }

        const answer = await runChat(trimmed, intent, messages);
        if (!answer) {
          setMessages((prev) => prev.filter((m) => m.id !== pendingId));
          return;
        }
        const routing = lastRoutingRef.current;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  ...m,
                  content: answer,
                  pending: false,
                  fellBack: routing?.fellBack,
                  servedBy: routing
                    ? { provider: routing.provider, model: routing.model }
                    : undefined,
                }
              : m,
          ),
        );
      } catch (e) {
        const notice = e instanceof AiRequestError
          ? formatAiUserNotice(e.code, e.message)
          : noticeFromUnknownError(e);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId ? { ...m, content: notice, pending: false, error: true } : m,
          ),
        );
        toast.error(i18n.t("toasts.unavailable", { ns: "assistant" }), { description: notice });
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages, runAgent, runChat],
  );

  useEffect(() => {
    setStructureAnalysis((prev) => ({ ...prev, active: null }));
  }, [viewer.proteinSelection]);

  const closeExplainPopover = useCallback(() => setExplainPopover(null), []);
  const clearMessages = useCallback(() => setMessages([]), []);

  const value = useMemo<AssistantContextValue>(
    () => ({
      messages,
      status,
      statusLoading,
      chatOpen,
      setChatOpen,
      isSending,
      lastContext,
      buildContext,
      sendMessage,
      runAgentQuery,
      explain,
      clearMessages,
      registerContextExtension,
      explainPopover,
      closeExplainPopover,
      aiSettings,
      updateAiSettings,
      resetAiSettings,
      aiKeysSettings,
      updateAiKeysSettings,
      clearAiKeys,
      aiConfigured,
      usingClientKeys,
      refreshAiStatus,
      testAiConnection,
      structureAnalysis,
      analyzeStructure,
      closeStructureAnalysis,
    }),
    [
      messages,
      status,
      statusLoading,
      chatOpen,
      isSending,
      lastContext,
      buildContext,
      sendMessage,
      runAgentQuery,
      explain,
      clearMessages,
      registerContextExtension,
      explainPopover,
      closeExplainPopover,
      aiSettings,
      updateAiSettings,
      resetAiSettings,
      aiKeysSettings,
      updateAiKeysSettings,
      clearAiKeys,
      aiConfigured,
      usingClientKeys,
      refreshAiStatus,
      testAiConnection,
      structureAnalysis,
      analyzeStructure,
      closeStructureAnalysis,
    ],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}

export function useAssistantOptional() {
  return useContext(AssistantContext);
}
