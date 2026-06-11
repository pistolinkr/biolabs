import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { i18n } from "@/i18n";
import { useViewer } from "@/contexts/ViewerContext";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { buildAiPlatformContext } from "@/lib/ai/contextBuilder";
import {
  DEFAULT_AI_CLIENT_SETTINGS,
  loadAiClientSettings,
  saveAiClientSettings,
  type AiClientSettings,
} from "@/lib/ai/aiSettingsStorage";
import { fetchAiStatus, sendAiChat } from "@/lib/ai/assistantApi";
import { AiRequestError, formatAiUserNotice, noticeFromUnknownError } from "@/lib/ai/userErrors";
import type { AiChatMessage, AiExplainIntent, AiPlatformContext, AiStatusResponse } from "@shared/ai/types";

export interface AssistantUiMessage extends AiChatMessage {
  id: string;
  pending?: boolean;
  error?: boolean;
}

export interface ContextExtensionSlice {
  domain?: string | null;
  mutation?: string | null;
  input_drafts?: string | null;
  annotations?: string | null;
  platform_generated_analysis?: string | null;
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
  refreshAiStatus: () => Promise<void>;
  testAiConnection: () => Promise<boolean>;
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
  const [aiSettings, setAiSettings] = useState<AiClientSettings>(() => loadAiClientSettings());

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
      const s = await fetchAiStatus();
      setStatus(s);
    } catch {
      setStatus({
        configured: false,
        active_provider: null,
        available_providers: [],
        models: {},
        rate_limit_per_minute: 20,
        max_output_tokens: 1024,
        max_context_chars: 24000,
        server_provider: "auto",
      });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAiStatus();
  }, [refreshAiStatus]);

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

  const runChat = useCallback(
    async (userText: string, intent: AiExplainIntent, history: AssistantUiMessage[]) => {
      if (!status?.configured) {
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

      const response = await sendAiChat({
        messages: chatHistory,
        context,
        intent,
        provider: aiSettings.preferredProvider,
        generation: {
          temperature: aiSettings.temperature,
          maxOutputTokens: Math.min(
            aiSettings.maxOutputTokens,
            status?.max_output_tokens ?? aiSettings.maxOutputTokens,
          ),
          responseLanguage: aiSettings.responseLanguage,
        },
      });
      return response.message;
    },
    [buildContext, status?.configured, status?.max_output_tokens, aiSettings],
  );

  const sendMessage = useCallback(
    async (text: string, intent: AiExplainIntent = "general") => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const userMsg: AssistantUiMessage = { id: nextId(), role: "user", content: trimmed };
      const pendingId = nextId();
      setMessages((prev) => [...prev, userMsg, { id: pendingId, role: "assistant", content: "", pending: true }]);
      setIsSending(true);

      try {
        const answer = await runChat(trimmed, intent, messages);
        if (!answer) {
          setMessages((prev) => prev.filter((m) => m.id !== pendingId));
          return;
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingId ? { ...m, content: answer, pending: false } : m)),
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
    [isSending, messages, runChat],
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
    if (!status?.configured) {
      toast.error(i18n.t("toasts.notConfigured", { ns: "assistant" }), {
        description: formatAiUserNotice("AI_NOT_CONFIGURED", i18n.t("toasts.notConfiguredHint", { ns: "assistant" })),
      });
      return false;
    }
    try {
      const context = buildContext();
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
  }, [status?.configured, buildContext, aiSettings.preferredProvider]);

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
      explain,
      clearMessages,
      registerContextExtension,
      explainPopover,
      closeExplainPopover,
      aiSettings,
      updateAiSettings,
      resetAiSettings,
      refreshAiStatus,
      testAiConnection,
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
      explain,
      clearMessages,
      registerContextExtension,
      explainPopover,
      closeExplainPopover,
      aiSettings,
      updateAiSettings,
      resetAiSettings,
      refreshAiStatus,
      testAiConnection,
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
