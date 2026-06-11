import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Microscope, Command, Settings, Save, Download } from "lucide-react";
import { toast } from "sonner";
import AskAIButton from "@/components/assistant/AskAIButton";
import HeaderExportMenu from "@/components/HeaderExportMenu";
import { useViewer } from "@/contexts/ViewerContext";
import { buildWorkspaceSnapshot, persistWorkspaceSnapshot } from "@/lib/workspaceSnapshot";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  onCommandPaletteOpen: () => void;
  onSettingsOpen: () => void;
}

export default function AppHeader({ onCommandPaletteOpen, onSettingsOpen }: AppHeaderProps) {
  const { t } = useTranslation("header");
  const { t: tc } = useTranslation("common");
  const viewer = useViewer();

  const saveWorkspace = useCallback(() => {
    const snapshot = buildWorkspaceSnapshot({
      proteinSelection: viewer.proteinSelection,
      representation: viewer.representation,
      colorScheme: viewer.colorScheme,
      isolateChainId: viewer.isolateChainId,
      contextContactRadiusAngstrom: viewer.contextContactRadiusAngstrom,
      selectedResidueKey: viewer.selectedResidueKey,
    });
    persistWorkspaceSnapshot(snapshot);
    toast.success(t("saveSuccess"), {
      description: snapshot.viewer.proteinSelection
        ? t("saveSuccessWithProtein", {
            source: snapshot.viewer.proteinSelection.source,
            id: snapshot.viewer.proteinSelection.id,
          })
        : t("saveSuccessGeneric"),
    });
  }, [viewer, t]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onCommandPaletteOpen();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveWorkspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCommandPaletteOpen, saveWorkspace]);

  const iconBtn =
    "border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-secondary hover:text-foreground";

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center border border-accent">
          <Microscope size={14} className="text-accent" />
        </div>
        <span className="text-sm font-medium tracking-tight">{tc("appName")}</span>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <button
          onClick={onCommandPaletteOpen}
          className="flex items-center gap-2 border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
        >
          <Command size={14} />
          <span>{t("command")}</span>
          <span className="ml-2 text-xs opacity-50">⌘K</span>
        </button>
        <AskAIButton />
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={saveWorkspace}
          title={t("saveWorkspace")}
          className={iconBtn}
        >
          <Save size={14} />
        </button>
        <HeaderExportMenu>
          <button type="button" title={t("exportMenu")} className={iconBtn}>
            <Download size={14} />
          </button>
        </HeaderExportMenu>
        <div className="mx-1 h-6 w-px bg-border" />
        <button
          type="button"
          onClick={onSettingsOpen}
          title={tc("actions.settings")}
          className={cn(iconBtn, "text-foreground")}
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
}
