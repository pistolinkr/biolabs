import AIChatPanel from "@/components/assistant/AIChatPanel";
import { useTranslation } from "react-i18next";
import { usePhaeleonAssistantChatConfig } from "@/hooks/usePhaeleonAssistantChatConfig";
import { cn } from "@/lib/utils";

/** Classic / Consult — assistant dock in the right column stack. */
export default function PhaeleonAssistantDock({ placeholder }: { placeholder?: string } = {}) {
  const { t } = useTranslation("phaeleon");
  const { pairReady, contextBadge, quickPrompts, onAnchorClick } = usePhaeleonAssistantChatConfig();
  const resolvedPlaceholder =
    placeholder ?? (pairReady ? t("assistant.placeholder") : t("assistant.emptyNoPair"));

  return (
    <div className={cn("assistant-panel flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-card")}>
      <AIChatPanel
        chatIntent="agent"
        panelPadding="workbench"
        headerKicker={t("panels.assistant.kicker")}
        headerTitle={t("assistant.dockTitle")}
        assistantName={t("assistant.aiName")}
        placeholder={resolvedPlaceholder}
        emptyState={pairReady ? t("assistant.emptyWithPair") : t("assistant.emptyNoPair")}
        inputContextBadge={contextBadge}
        quickPrompts={quickPrompts}
        onAnchorClick={onAnchorClick}
      />
    </div>
  );
}
