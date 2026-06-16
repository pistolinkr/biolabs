import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Command, Settings } from "lucide-react";
import { useLocation } from "wouter";
import AskAIButton from "@/components/assistant/AskAIButton";
import PhaeleonAskAIButton from "@/components/phaeleon/PhaeleonAskAIButton";
import { cn } from "@/lib/utils";

interface ToolShellHeaderProps {
  toolName: string;
  icon: React.ReactNode;
  showAssistant?: boolean;
  onSettingsOpen?: () => void;
  onCommandPaletteOpen?: () => void;
  usePhaeleonAssistant?: boolean;
  trailingActions?: React.ReactNode;
}

export default function ToolShellHeader({
  toolName,
  icon,
  showAssistant = true,
  onSettingsOpen,
  onCommandPaletteOpen,
  usePhaeleonAssistant = false,
  trailingActions,
}: ToolShellHeaderProps) {
  const { t } = useTranslation("header");
  const { t: tc } = useTranslation("common");
  const [, setLocation] = useLocation();

  const iconBtn =
    "border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-secondary hover:text-foreground";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setLocation("/")}
          className={cn(iconBtn, "mr-1")}
          title={tc("notFound.back")}
        >
          <ArrowLeft size={14} />
        </button>
        <div
          className={cn(
            "flex items-center justify-center",
            usePhaeleonAssistant ? "size-8" : "size-6 border border-accent",
          )}
        >
          {icon}
        </div>
        <span className="text-sm font-medium tracking-tight">{toolName}</span>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        {onCommandPaletteOpen ? (
          <button
            type="button"
            onClick={onCommandPaletteOpen}
            className="flex items-center gap-2 border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            <Command size={14} />
            <span>{t("command")}</span>
            <span className="ml-2 text-xs opacity-50">⌘K</span>
          </button>
        ) : null}
        {showAssistant ? (usePhaeleonAssistant ? <PhaeleonAskAIButton /> : <AskAIButton />) : null}
      </div>

      <div className="flex items-center gap-1">
        {trailingActions}
        {onSettingsOpen ? (
          <button
            type="button"
            onClick={onSettingsOpen}
            title={tc("actions.settings")}
            className={cn(iconBtn, "text-foreground")}
          >
            <Settings size={14} />
          </button>
        ) : null}
      </div>
    </header>
  );
}
