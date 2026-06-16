import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export default function PhaeleonStackResizeHandle({
  resizing,
  resizeHandleProps,
}: {
  resizing?: boolean;
  resizeHandleProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  const { t } = useTranslation("phaeleon");

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={t("layout.assistantStackResize")}
      title={t("layout.assistantStackResize")}
      className={cn(
        "relative z-10 h-1.5 shrink-0 touch-none cursor-ns-resize border-t border-border bg-background",
        "hover:bg-secondary/80 active:bg-secondary",
        resizing && "bg-secondary",
      )}
      {...resizeHandleProps}
    />
  );
}
