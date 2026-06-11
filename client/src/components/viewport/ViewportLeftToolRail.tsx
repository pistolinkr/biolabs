import {
  Camera,
  Download,
  Fullscreen,
  Orbit,
  Sparkles,
  Sun,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAssistant } from "@/contexts/AssistantContext";
import { useViewer } from "@/contexts/ViewerContext";
import { cn } from "@/lib/utils";

export function RailBtn({
  title,
  onClick,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center border border-[#2A2A2A] bg-[#111111] text-[#9A9A9A] transition-colors hover:border-[#4A4A4A] hover:text-[#F2F2F2]",
        active && "border-[#5A6A6A] text-[#F2F2F2]",
      )}
    >
      {children}
    </button>
  );
}

/** RCSB-style left vertical tool column (I/O, spin, fog). */
export default function ViewportLeftToolRail() {
  const { t } = useTranslation("viewport");
  const { runViewerCommand, spinEnabled, renderOptions, setRenderOptions } = useViewer();
  const { aiSettings, updateAiSettings } = useAssistant();

  return (
    <div className="flex w-11 shrink-0 flex-col gap-1 border-r border-[#2A2A2A] bg-[#0A0A0A] px-1.5 py-1.5">
      <RailBtn title={t("rail.screenshot")} onClick={() => runViewerCommand("screenshot")}>
        <Camera className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn title={t("rail.exportCoords")} onClick={() => runViewerCommand("export.cif")}>
        <Download className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn title={t("rail.fullscreen")} onClick={() => runViewerCommand("view.fullscreen.toggle")}>
        <Fullscreen className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn title={t("rail.spin")} active={spinEnabled} onClick={() => runViewerCommand("view.spin.toggle")}>
        <Orbit className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn
        title={t("rail.depthCue")}
        active={renderOptions.depthCue}
        onClick={() => setRenderOptions({ depthCue: !renderOptions.depthCue })}
      >
        <Sun className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <div className="mt-1 border-t border-[#2A2A2A] pt-1">
        <RailBtn
          title={
            aiSettings.showResidueExplainPopup ? t("rail.aiAnalysisOn") : t("rail.aiAnalysisOff")
          }
          active={aiSettings.showResidueExplainPopup}
          onClick={() =>
            updateAiSettings({ showResidueExplainPopup: !aiSettings.showResidueExplainPopup })
          }
        >
          <Sparkles className="size-3.5" strokeWidth={1.25} />
        </RailBtn>
      </div>
    </div>
  );
}
