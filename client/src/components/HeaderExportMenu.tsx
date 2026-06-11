import React from "react";
import { useTranslation } from "react-i18next";
import { Camera, Download, FileJson, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useViewer } from "@/contexts/ViewerContext";
import {
  buildWorkspaceSnapshot,
  downloadWorkspaceJson,
} from "@/lib/workspaceSnapshot";
import { toast } from "sonner";

interface HeaderExportMenuProps {
  children: React.ReactNode;
}

export default function HeaderExportMenu({ children }: HeaderExportMenuProps) {
  const { t } = useTranslation("header");
  const viewer = useViewer();
  const [open, setOpen] = React.useState(false);

  const runExport = (cmd: string, label: string) => {
    setOpen(false);
    viewer.runViewerCommand(cmd);
    if (cmd !== "export.cif" && cmd !== "screenshot") {
      toast.message(label);
    }
  };

  const exportWorkspaceJson = () => {
    setOpen(false);
    const snapshot = buildWorkspaceSnapshot({
      proteinSelection: viewer.proteinSelection,
      representation: viewer.representation,
      colorScheme: viewer.colorScheme,
      isolateChainId: viewer.isolateChainId,
      contextContactRadiusAngstrom: viewer.contextContactRadiusAngstrom,
      selectedResidueKey: viewer.selectedResidueKey,
    });
    downloadWorkspaceJson(snapshot);
    toast.success(t("export.jsonDownloaded"));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-56 rounded-none border-border bg-card p-1 font-mono text-[10px] text-foreground"
      >
        <button
          type="button"
          onClick={() => runExport("export.cif", t("export.structure"))}
          disabled={!viewer.proteinSelection}
          className="flex w-full items-center gap-2 px-2 py-2 text-left uppercase tracking-wide hover:bg-secondary disabled:opacity-40"
        >
          <FileText className="size-3.5 shrink-0" />
          {t("export.structure")}
        </button>
        <button
          type="button"
          onClick={() => runExport("screenshot", t("export.screenshot"))}
          className="flex w-full items-center gap-2 px-2 py-2 text-left uppercase tracking-wide hover:bg-secondary"
        >
          <Camera className="size-3.5 shrink-0" />
          {t("export.screenshot")}
        </button>
        <button
          type="button"
          onClick={exportWorkspaceJson}
          className="flex w-full items-center gap-2 px-2 py-2 text-left uppercase tracking-wide hover:bg-secondary"
        >
          <FileJson className="size-3.5 shrink-0" />
          {t("export.snapshot")}
        </button>
        <div className="border-t border-border px-2 py-1.5 text-[8px] text-muted-foreground">
          <Download className="mr-1 inline size-3" />
          {t("export.footerHint")}
        </div>
      </PopoverContent>
    </Popover>
  );
}
