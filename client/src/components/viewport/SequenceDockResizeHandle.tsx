import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export default function SequenceDockResizeHandle({
  resizing,
  resizeHandleProps,
}: {
  resizing?: boolean;
  resizeHandleProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  const { t } = useTranslation("viewport");

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={t("sequenceDock.resize")}
      title={t("sequenceDock.resize")}
      className={cn(
        "relative z-10 h-1.5 shrink-0 touch-none cursor-ns-resize bg-transparent",
        "hover:bg-transparent active:bg-transparent",
        resizing && "bg-transparent",
      )}
      {...resizeHandleProps}
    />
  );
}
