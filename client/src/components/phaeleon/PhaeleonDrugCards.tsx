import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { phaeleonPanel } from "@/components/phaeleon/phaeleonPanelChrome";
import type { HelixDrugSlot } from "@/contexts/PhaeleonContext";
import type { DrugSlot } from "@/lib/phaeleon/types";
import { cn } from "@/lib/utils";

function drugBoxClass(active: boolean, interactive = false) {
  return cn(
    phaeleonPanel.box,
    active && "border-accent bg-secondary/50 ring-1 ring-accent/60 shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.15)]",
    !active && interactive && "hover:border-muted-foreground/60",
  );
}

/** Inspector — assigned Drug A/B with clear. */
export function PhaeleonDrugSlotCard({
  label,
  drug,
  active,
  onSelect,
  onClear,
}: {
  label: string;
  drug: { name: string } | null;
  active: boolean;
  onSelect: () => void;
  onClear: () => void;
}) {
  return (
    <div className={drugBoxClass(active)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSelect}
          className="font-mono text-[9px] uppercase tracking-[0.14em] text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {label}
        </button>
        {drug ? (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Clear"
          >
            <X size={12} />
          </button>
        ) : null}
      </div>
      {drug ? (
        <p className="text-sm font-medium leading-snug">{drug.name}</p>
      ) : (
        <p className="text-xs text-muted-foreground">—</p>
      )}
    </div>
  );
}

/** Input — pick active slot before FDA search. */
export function PhaeleonDrugSelectBlock({
  slot,
  label,
  drug,
  selected,
  onSelect,
  buttonRef,
}: {
  slot: HelixDrugSlot;
  label: string;
  drug: DrugSlot | null;
  selected: boolean;
  onSelect: (slot: HelixDrugSlot) => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useTranslation("phaeleon");

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onSelect(slot)}
      aria-pressed={selected}
      className={cn("w-full text-left", drugBoxClass(selected, true))}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-accent">{label}</p>
        {selected ? (
          <span className="shrink-0 border border-accent/50 bg-accent/10 px-1.5 py-0 font-mono text-[8px] uppercase tracking-[0.12em] text-accent">
            {t("input.activeSlot")}
          </span>
        ) : null}
      </div>
      {!drug ? (
        <p className="text-xs text-muted-foreground">{t("inspector.noDrug")}</p>
      ) : (
        <>
          <p className="text-sm font-medium">{drug.name}</p>
          {drug.genericNames.length > 0 ? (
            <div className="mt-2">
              <p className={phaeleonPanel.microLabel}>{t("inspector.generic")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{drug.genericNames.slice(0, 3).join(", ")}</p>
            </div>
          ) : null}
          {drug.brandNames.length > 0 ? (
            <div className="mt-2">
              <p className={phaeleonPanel.microLabel}>{t("inspector.brand")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{drug.brandNames.slice(0, 3).join(", ")}</p>
            </div>
          ) : null}
        </>
      )}
    </button>
  );
}
