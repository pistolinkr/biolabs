import React from "react";
import { useTranslation } from "react-i18next";
import PhaeleonLogo from "@/components/phaeleon/PhaeleonLogo";

export default function PhaeleonAssistantFirstWelcome() {
  const { t } = useTranslation("phaeleon");

  return (
    <div className="flex min-h-[min(420px,50vh)] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center">
        <PhaeleonLogo size={28} decorative />
      </div>
      <h2 className="text-lg font-medium tracking-tight text-foreground">{t("assistantFirst.welcome.title")}</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{t("assistantFirst.welcome.body")}</p>
      <ul className="mt-6 max-w-md space-y-2 text-left text-xs leading-relaxed text-muted-foreground/90">
        <li className="flex gap-2">
          <span className="text-accent">·</span>
          {t("assistantFirst.welcome.suggestion1")}
        </li>
        <li className="flex gap-2">
          <span className="text-accent">·</span>
          {t("assistantFirst.welcome.suggestion2")}
        </li>
        <li className="flex gap-2">
          <span className="text-accent/70">·</span>
          <span className="opacity-75">{t("assistantFirst.welcome.suggestion3")}</span>
        </li>
      </ul>
    </div>
  );
}
