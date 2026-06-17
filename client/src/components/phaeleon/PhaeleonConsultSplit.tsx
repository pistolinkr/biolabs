import React from "react";
import { useTranslation } from "react-i18next";
import PhaeleonAnalysisPanel from "@/components/phaeleon/PhaeleonAnalysisPanel";
import PhaeleonAssistantDock from "@/components/phaeleon/PhaeleonAssistantDock";
import { usePhaeleon } from "@/contexts/PhaeleonContext";

/** Consult preset — slim input · report · persistent AI (320px). */
export default function PhaeleonConsultSplit() {
  const { t } = useTranslation("phaeleon");
  const { settings } = usePhaeleon();

  return (
    <>
      <PhaeleonAnalysisPanel />
      <div
        id="phaeleon-assistant-dock"
        className="min-h-0 min-w-0 shrink-0 overflow-hidden"
        style={{ width: settings.rightColumnWidth }}
      >
        <PhaeleonAssistantDock placeholder={t("assistant.askBinaryPlaceholder")} />
      </div>
    </>
  );
}
