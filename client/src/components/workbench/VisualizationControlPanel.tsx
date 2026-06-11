import React from "react";
import { useTranslation } from "react-i18next";
import { useViewer } from "@/contexts/ViewerContext";
import type { VizColorSchemeId, VizRepresentationId } from "@/lib/nglRepr";

const REPR: { id: VizRepresentationId; labelKey: string }[] = [
  { id: "cartoon", labelKey: "display.repr.cartoon" },
  { id: "rope", labelKey: "display.repr.rope" },
  { id: "surface", labelKey: "display.repr.surface" },
  { id: "ball+stick", labelKey: "display.repr.ballStick" },
  { id: "spacefill", labelKey: "display.repr.spacefill" },
  { id: "line", labelKey: "display.repr.line" },
];

const COLORS: { id: VizColorSchemeId; labelKey: string }[] = [
  { id: "chainid", labelKey: "display.colors.chainid" },
  { id: "residueindex", labelKey: "display.colors.residueindex" },
  { id: "hydrophobicity", labelKey: "display.colors.hydrophobicity" },
  { id: "bfactor", labelKey: "display.colors.bfactor" },
  { id: "bfactor_gray", labelKey: "display.colors.bfactor_gray" },
  { id: "electrostatic", labelKey: "display.colors.electrostatic" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#2A2A2A] py-2">
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8A8A8A]">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function RowBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border px-2 py-1 text-left font-mono text-[10px] uppercase tracking-wide transition-colors ${
        active
          ? "border-[#F2F2F2] bg-[#1C1C1C] text-[#F2F2F2]"
          : "border-[#2A2A2A] bg-[#111111] text-[#8A8A8A] hover:border-[#3A3A3A] hover:text-[#C8C8C8]"
      }`}
    >
      {label}
    </button>
  );
}

export default function VisualizationControlPanel() {
  const { t } = useTranslation("workbench");
  const {
    representation,
    setRepresentation,
    colorScheme,
    setColorScheme,
    renderOptions,
    setRenderOptions,
    spinEnabled,
    setSpinEnabled,
    measurementMode,
    setMeasurementMode,
  } = useViewer();

  const renderRows = [
    ["ambientOcclusion", "display.ambientOcclusion", renderOptions.ambientOcclusion] as const,
    ["shadows", "display.shadows", renderOptions.shadows] as const,
    ["transparency", "display.transparency", renderOptions.transparency] as const,
    ["edgeEnhancement", "display.edgeEnhancement", renderOptions.edgeEnhancement] as const,
    ["depthCue", "display.depthCue", renderOptions.depthCue] as const,
  ] as const;

  return (
    <div className="min-h-0 flex-1 overflow-y-hidden px-2 pb-3 pt-1">
      <Section title={t("display.representation")}>
        <div className="grid grid-cols-2 gap-1">
          {REPR.map((r) => (
            <RowBtn
              key={r.id}
              active={representation === r.id}
              label={t(r.labelKey)}
              onClick={() => setRepresentation(r.id)}
            />
          ))}
        </div>
      </Section>

      <Section title={t("display.coloring")}>
        <div className="space-y-1">
          {COLORS.map((c) => (
            <RowBtn
              key={c.id}
              active={colorScheme === c.id}
              label={t(c.labelKey)}
              onClick={() => setColorScheme(c.id)}
            />
          ))}
        </div>
      </Section>

      <Section title={t("display.rendering")}>
        {renderRows.map(([key, labelKey, val]) => (
          <label
            key={key}
            className="flex cursor-pointer items-center justify-between gap-2 font-mono text-[10px] text-[#B0B0B0]"
          >
            <span>{t(labelKey)}</span>
            <input
              type="checkbox"
              checked={val}
              onChange={() => setRenderOptions({ [key]: !val })}
              className="accent-[#7C8A99]"
            />
          </label>
        ))}
      </Section>

      <Section title={t("display.simulation")}>
        <label className="flex cursor-pointer items-center justify-between font-mono text-[10px] text-[#B0B0B0]">
          <span>{t("display.spin")}</span>
          <input
            type="checkbox"
            checked={spinEnabled}
            onChange={() => setSpinEnabled(!spinEnabled)}
            className="accent-[#7C8A99]"
          />
        </label>
        <p className="font-mono text-[9px] leading-tight text-[#6A6A6A]">
          {t("display.trajectoryNote")}
        </p>
      </Section>

      <Section title={t("display.measurement")}>
        {(["none", "distance", "angle", "dihedral"] as const).map((m) => (
          <RowBtn
            key={m}
            active={measurementMode === m}
            label={t(`display.measureModes.${m}`)}
            onClick={() => setMeasurementMode(m)}
          />
        ))}
      </Section>
    </div>
  );
}
