import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { History, PanelRight } from "lucide-react";
import PhaeleonInspectorPanel from "@/components/phaeleon/PhaeleonInspectorPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PHAELEON_SEARCH_FOCUS_EVENT, usePhaeleon } from "@/contexts/PhaeleonContext";
import { cn } from "@/lib/utils";

const iconBtn =
  "flex size-8 items-center justify-center border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-secondary hover:text-foreground";

export default function PhaeleonAssistantFirstHeaderActions() {
  const { t } = useTranslation("phaeleon");
  const { recentSearches, setSearchQuery } = usePhaeleon();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);

  return (
    <>
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetTrigger asChild>
          <button type="button" className={cn(iconBtn)} title={t("assistantFirst.history")}>
            <History size={14} />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[min(100vw,360px)] p-0">
          <SheetHeader className="border-b border-border px-4 py-3 text-left">
            <SheetTitle className="text-sm">{t("assistantFirst.history")}</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            {recentSearches.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("assistantFirst.historyEmpty")}</p>
            ) : (
              <ul className="space-y-1">
                {recentSearches.map((query) => (
                  <li key={query}>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery(query);
                        setHistoryOpen(false);
                        window.dispatchEvent(new Event(PHAELEON_SEARCH_FOCUS_EVENT));
                      }}
                      className="w-full border border-border px-3 py-2 text-left text-xs hover:border-accent hover:text-accent"
                    >
                      {query}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={metadataOpen} onOpenChange={setMetadataOpen}>
        <SheetTrigger asChild>
          <button type="button" className={cn(iconBtn)} title={t("assistantFirst.metadata")}>
            <PanelRight size={14} />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[min(100vw,420px)] p-0">
          <SheetHeader className="border-b border-border px-4 py-3 text-left">
            <SheetTitle className="text-sm">{t("assistantFirst.metadata")}</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-3.5rem)] min-h-0">
            <PhaeleonInspectorPanel />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
