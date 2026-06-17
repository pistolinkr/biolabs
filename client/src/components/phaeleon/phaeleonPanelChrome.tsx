import React from "react";
import { cn } from "@/lib/utils";

/** Shared Phaeleon panel chrome — one border weight, one rhythm. */
export const phaeleonPanel = {
  shell: "flex min-h-0 flex-col overflow-hidden bg-card",
  scrollShell: "h-full min-h-0 overflow-y-auto bg-card",
  /** Fixed height so column header borders align across the grid. */
  header: "box-border flex h-14 shrink-0 flex-col justify-center border-b border-border px-3",
  kicker: "font-mono text-[9px] uppercase leading-none tracking-[0.14em] text-muted-foreground",
  title: "truncate text-sm font-medium leading-tight",
  section: "border-b border-border p-3",
  sectionLabel: "mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground",
  microLabel: "font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground",
  body: "workstation-scroll-region min-h-0 flex-1 p-3",
  footer: "shrink-0 border-t border-border p-3",
  box: "border border-border bg-background p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  boxActive: "border-accent bg-secondary/50 ring-1 ring-accent/60",
  boxEmpty: "border border-dashed border-border bg-background p-3",
  control:
    "border border-border bg-background px-2 py-1.5 outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
} as const;

export function PhaeleonPanelHeader({
  kicker,
  title,
  trailing,
  className,
}: {
  kicker: string;
  title: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(phaeleonPanel.header, className)}>
      <p className={phaeleonPanel.kicker}>{kicker}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <h2 className={cn(phaeleonPanel.title, "min-w-0")}>{title}</h2>
        <div className="flex h-5 shrink-0 items-center justify-end">{trailing}</div>
      </div>
    </div>
  );
}

export function PhaeleonPanelSection({
  label,
  children,
  className,
  last = false,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
  last?: boolean;
}) {
  return (
    <div className={cn(!last && phaeleonPanel.section, last && "p-3", className)}>
      {label ? <p className={phaeleonPanel.sectionLabel}>{label}</p> : null}
      {children}
    </div>
  );
}
