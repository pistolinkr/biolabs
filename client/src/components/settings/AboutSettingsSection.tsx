import React from "react";
import { useTranslation } from "react-i18next";
import type { WorkstationId } from "@/lib/settings/workstationTypes";
import { APP_VERSION_LABEL } from "@shared/version";

interface AboutSettingsSectionProps {
  workstation: WorkstationId;
}

export default function AboutSettingsSection({ workstation }: AboutSettingsSectionProps) {
  const { t } = useTranslation("settings");
  const ns = workstation === "phaeleon" ? "about.phaeleon" : "about.helix";

  return (
    <div className="space-y-3 font-mono text-[10px] text-muted-foreground">
      <div className="workbench-kicker text-foreground">{t(`${ns}.kicker`)}</div>
      <div>{t(`${ns}.version`, { version: APP_VERSION_LABEL })}</div>
      <div>{t(`${ns}.stack`)}</div>
      <div className="pt-2 text-[9px]">{t("about.copyright")}</div>
    </div>
  );
}
