import { Crosshair, Layers, Palette } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useViewer, type ContextContactRadiusAngstrom } from "@/contexts/ViewerContext";
import type { VizColorSchemeId, VizRepresentationId } from "@/lib/nglRepr";
import { cn } from "@/lib/utils";

const REPR_ORDER: { id: VizRepresentationId; short: string }[] = [
  { id: "cartoon", short: "Ctn" },
  { id: "ribbon", short: "Rbn" },
  { id: "surface", short: "Srf" },
  { id: "ball+stick", short: "B&S" },
  { id: "line", short: "Wire" },
];

const CONTACT_RADIUS_PRESETS: ContextContactRadiusAngstrom[] = [4, 6, 10];

const COLOR_ORDER: { id: VizColorSchemeId; short: string }[] = [
  { id: "bfactor", short: "B" },
  { id: "bfactor_gray", short: "Conf" },
  { id: "residueindex", short: "Res" },
  { id: "electrostatic", short: "ES" },
];

function Seg({
  active,
  label,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap px-2 py-1 font-mono text-[9px] uppercase tracking-wide",
        active
          ? "text-foreground underline decoration-foreground underline-offset-4"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/** Viewport representation, coloring, and polymer context controls. */
export default function ViewportTopToolbar() {
  const { t } = useTranslation("viewport");
  const {
    representation,
    setRepresentation,
    colorScheme,
    setColorScheme,
    runViewerCommand,
    isolateChainId,
    setIsolateChainId,
    contextContactRadiusAngstrom,
    setContextContactRadiusAngstrom,
    polymerInteractionOverlayEnabled,
    nucleicBackboneAccentEnabled,
  } = useViewer();

  return (
    <div className="flex h-10 min-w-0 shrink-0 bg-background">
      <div
        className="no-scrollbar flex min-h-0 min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden overscroll-x-contain px-2.5"
        aria-label="Viewport toolbar — scroll horizontally for more controls"
      >
        <div className="mx-0.5 flex w-max flex-nowrap items-center gap-4 py-1.5 pr-1.5">
          <div className="flex shrink-0 items-center gap-1">
            <Layers className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.25} />
            {REPR_ORDER.map((r) => (
              <Seg
                key={r.id}
                title={r.id}
                label={r.short}
                active={representation === r.id}
                onClick={() => setRepresentation(r.id)}
              />
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Palette className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.25} />
            {COLOR_ORDER.map((c) => (
              <Seg
                key={c.id}
                title={c.id}
                label={c.short}
                active={colorScheme === c.id}
                onClick={() => setColorScheme(c.id)}
              />
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span title={t("toolbar.tips.context")} className="inline-flex shrink-0">
              <Crosshair
                className="size-3.5 text-muted-foreground"
                strokeWidth={1.25}
                aria-label={t("toolbar.tips.context")}
              />
            </span>
            {CONTACT_RADIUS_PRESETS.map((r) => (
              <Seg
                key={r}
                title={`${t("toolbar.tips.context")} ${r} Å`}
                label={`${r}Å`}
                active={contextContactRadiusAngstrom === r}
                onClick={() => setContextContactRadiusAngstrom(r)}
              />
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Seg
              title={t("toolbar.tips.interactions")}
              label="Ixn"
              active={polymerInteractionOverlayEnabled}
              onClick={() => runViewerCommand("analysis.interactions")}
            />
            <Seg
              title={t("toolbar.tips.nucleicAccent")}
              label="Nt"
              active={nucleicBackboneAccentEnabled}
              onClick={() => runViewerCommand("view.preset.nucleic.accent")}
            />
          </div>
          {isolateChainId ? (
            <button
              type="button"
              onClick={() => setIsolateChainId(null)}
              className="max-w-[7rem] shrink-0 truncate px-2 py-1 font-mono text-[9px] uppercase text-accent underline decoration-accent underline-offset-4 hover:text-foreground"
              title={t("toolbar.tips.clearIsolate")}
            >
              ISO {isolateChainId} ×
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
