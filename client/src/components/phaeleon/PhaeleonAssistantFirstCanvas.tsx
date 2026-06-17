import React from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import AIChatPanel from "@/components/assistant/AIChatPanel";
import AssistantFirstProgressiveReport from "@/components/phaeleon/AssistantFirstProgressiveReport";
import PhaeleonAssistantFirstWelcome from "@/components/phaeleon/PhaeleonAssistantFirstWelcome";
import { AnalysisLoadingState } from "@/components/phaeleon/PhaeleonAnalysisReportContent";
import { useAssistant } from "@/contexts/AssistantContext";
import { usePhaeleonAnalysisReport } from "@/hooks/usePhaeleonAnalysisReport";
import { usePhaeleonAssistantChatConfig } from "@/hooks/usePhaeleonAssistantChatConfig";
import { cn } from "@/lib/utils";

/** Assistant-first AI response canvas — welcome, progressive report, pinned composer. */
export default function PhaeleonAssistantFirstCanvas() {
  const { t } = useTranslation("phaeleon");
  const { clearMessages } = useAssistant();
  const { pairReady, contextBadge, quickPrompts, onAnchorClick } = usePhaeleonAssistantChatConfig();
  const {
    analysis,
    report,
    reportPending,
    showLocalizedReveal,
    initialAnalysisPending,
  } = usePhaeleonAnalysisReport();

  const showWelcome = !report && !reportPending;
  const showFollowUpDivider = Boolean(report && !reportPending);

  const canvasContent = initialAnalysisPending ? (
    <AnalysisLoadingState aiMode slim />
  ) : report && analysis ? (
    <AssistantFirstProgressiveReport report={report} source={analysis} reveal={showLocalizedReveal} />
  ) : showWelcome ? (
    <PhaeleonAssistantFirstWelcome />
  ) : null;

  return (
    <main className={cn("assistant-panel flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background")}>
      <div className="flex shrink-0 items-center justify-end gap-1 border-b border-border/40 px-3 py-1.5">
        <button
          type="button"
          onClick={clearMessages}
          title={t("assistant.clearChat")}
          className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <AIChatPanel
        chatIntent="agent"
        panelPadding="workbench"
        suppressHeader
        composerPinned
        scrollPrefix={
          canvasContent ? (
            <>
              {canvasContent}
              {showFollowUpDivider ? (
                <div className="mx-auto mt-8 max-w-3xl border-t border-border/60 pt-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {t("assistant.fusedConversation")}
                  </p>
                </div>
              ) : null}
            </>
          ) : undefined
        }
        assistantName={t("assistant.aiName")}
        placeholder={pairReady ? t("assistant.placeholder") : t("assistant.emptyNoPair")}
        emptyState=""
        hideEmptyMessages={Boolean(canvasContent)}
        inputContextBadge={pairReady ? contextBadge : undefined}
        quickPrompts={report && !reportPending ? quickPrompts : []}
        onAnchorClick={onAnchorClick}
        className="min-h-0 flex-1 bg-background"
      />
    </main>
  );
}
