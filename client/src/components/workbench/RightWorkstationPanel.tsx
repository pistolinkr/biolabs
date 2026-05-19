import React, { useMemo, useState } from "react";
import { entityKindLabel, groupChainsByEntityKind, type BiomolecularEntityKind } from "@/lib/biomolecularEntities";
import { useViewer, type ChainModel } from "@/contexts/ViewerContext";
import PolymerProximityGraph from "@/components/workbench/PolymerProximityGraph";

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#2A2A2A]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#F2F2F2] hover:bg-[#141414]"
      >
        {title}
        <span className="text-[#6A6A6A]">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="space-y-0.5 px-2 pb-2 pt-0">{children}</div> : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 font-mono text-[10px] leading-tight text-[#C8C8C8]">
      <span className="w-[40%] shrink-0 uppercase tracking-wide text-[#8A8A8A]">{k}</span>
      <span className="min-w-0 flex-1 text-[#F2F2F2]">{v}</span>
    </div>
  );
}

export default function RightWorkstationPanel() {
  const {
    proteinSelection,
    structureModel,
    colorScheme,
    isolateChainId,
    runViewerCommand,
    polymerContextSnapshot,
    contextContactRadiusAngstrom,
    polymerInteractionOverlayEnabled,
    setPolymerInteractionOverlayEnabled,
    nucleicBackboneAccentEnabled,
    setNucleicBackboneAccentEnabled,
    requestReprRefresh,
  } = useViewer();
  const [assemblyPick, setAssemblyPick] = useState("asu");

  const basic = useMemo(() => {
    const sel = proteinSelection;
    if (!sel) {
      return {
        name: "—",
        organism: "—",
        uniprot: "—",
        pdb: "—",
        resolution: "—",
        method: "—",
      };
    }
    const pdb = sel.pdbIds?.[0] ?? (sel.source === "rcsb" ? sel.id : "—");
    const uni = sel.source === "uniprot" ? sel.id : sel.pdbIds?.length ? "(see PDB)" : "—";
    return {
      name: sel.label.split("—")[0]?.trim() ?? sel.id,
      organism: "—",
      uniprot: uni,
      pdb,
      resolution: "—",
      method:
        sel.source === "file"
          ? "LOCAL FILE"
          : sel.preferredStructure === "alphafold"
            ? "PREDICTION (AFDB)"
            : "—",
    };
  }, [proteinSelection]);

  const structure = useMemo(() => {
    if (!structureModel) {
      return {
        atoms: "—",
        residues: "—",
        chains: "—",
        ligands: "—",
        missing: "—",
      };
    }
    return {
      atoms: structureModel.atomCount.toLocaleString(),
      residues: structureModel.residueCount.toLocaleString(),
      chains: String(structureModel.chains.length),
      ligands: "hetero / solvent (NGL)",
      missing: "not parsed",
    };
  }, [structureModel]);

  const polymerMock = {
    subunits: structureModel ? structureModel.chains.map((c: ChainModel) => c.id).join(", ") : "—",
    entityLanes:
      structureModel?.chains
        .map((c: ChainModel) => `${c.id}·${entityKindLabel(c.entityKind)}`)
        .join(" · ") ?? "—",
    interfaces: isolateChainId ? `isolated: ${isolateChainId}` : "full assembly view",
    hbonds: "—",
    salt: "—",
    hp: "—",
    stoich: structureModel
      ? Object.entries(groupChainsByEntityKind(structureModel.chains))
          .map(([k, arr]) =>
            arr?.length ? `${arr.length}×${entityKindLabel(k as BiomolecularEntityKind)}` : null,
          )
          .filter(Boolean)
          .join(" · ") || "—"
      : "—",
    symmetry: "—",
    ifaceArea: "—",
    bindEnergy: "—",
    ixnCount: "—",
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card text-card-foreground">
      <div className="shrink-0 border-b border-border bg-card px-2 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        Inspector
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Basic info">
          <Row k="Protein" v={basic.name} />
          <Row k="Organism" v={basic.organism} />
          <Row k="UniProt" v={basic.uniprot} />
          <Row k="PDB" v={basic.pdb} />
          <Row k="Resolution" v={basic.resolution} />
          <Row k="Method" v={basic.method} />
        </Section>

        <Section title="Structure stats">
          <Row k="Atoms" v={structure.atoms} />
          <Row k="Residues" v={structure.residues} />
          <Row k="Chains" v={structure.chains} />
          <Row k="Ligands" v={structure.ligands} />
          <Row k="Missing" v={structure.missing} />
        </Section>

        <Section title="Polymer context (distance)">
          {!polymerContextSnapshot ? (
            <p className="font-mono text-[9px] leading-snug text-[#6A6A6A]">
              Pick a residue in the viewport or from the sequence dock — neighborhood is computed from heavy-atom
              proximity (radius {contextContactRadiusAngstrom} Å). Codons, grooves, and H-bonds are not inferred in this
              phase.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 py-1 font-mono text-[9px]">
                <label className="flex cursor-pointer items-center gap-1 text-[#9A9A9A]">
                  <input
                    type="checkbox"
                    checked={polymerInteractionOverlayEnabled}
                    onChange={(e) => {
                      setPolymerInteractionOverlayEnabled(e.target.checked);
                      requestReprRefresh();
                    }}
                    className="accent-[#8A8A8A]"
                  />
                  Contact lines (heuristic)
                </label>
                <label className="flex cursor-pointer items-center gap-1 text-[#9A9A9A]">
                  <input
                    type="checkbox"
                    checked={nucleicBackboneAccentEnabled}
                    onChange={(e) => {
                      setNucleicBackboneAccentEnabled(e.target.checked);
                      requestReprRefresh();
                    }}
                    className="accent-[#8A8A8A]"
                  />
                  Nucleic line accent
                </label>
              </div>
              <Row k="Radius" v={`${polymerContextSnapshot.radiusAngstrom} Å (preset ${contextContactRadiusAngstrom} Å)`} />
              <Row
                k="Center (Å)"
                v={`${polymerContextSnapshot.center.x.toFixed(2)}, ${polymerContextSnapshot.center.y.toFixed(2)}, ${polymerContextSnapshot.center.z.toFixed(2)}`}
              />
              <Row k="Chains" v={polymerContextSnapshot.chainsTouched.join(", ") || "—"} />
              <Row k="Nucleic chains" v={polymerContextSnapshot.nucleicChains.join(", ") || "—"} />
              <Row k="Residues (protein)" v={String(polymerContextSnapshot.proteinResidueCount)} />
              <Row k="Residues (nucleic)" v={String(polymerContextSnapshot.nucleicResidueCount)} />
              <Row k="Residues (other)" v={String(polymerContextSnapshot.otherResidueCount)} />
              <Row k="Codon" v="N/A (not computed from coordinates)" />
              <Row
                k="Polar contacts ≤3.5Å"
                v={`${polymerContextSnapshot.candidatePolarContactCount} (H-bond candidates only)`}
              />
              <Row k="Heavy contacts ≤4Å" v={String(polymerContextSnapshot.candidateHeavyContactCount)} />
              <Row k="Phosphate-touch pairs" v={String(polymerContextSnapshot.candidatePhosphateContactCount)} />
              {polymerContextSnapshot.nearestNucleic ? (
                <Row
                  k="Nearest NT"
                  v={`chain ${polymerContextSnapshot.nearestNucleic.chainId} · PDB ${polymerContextSnapshot.nearestNucleic.pdbResno} · seq #${polymerContextSnapshot.nearestNucleic.stripOrdinal}${polymerContextSnapshot.nearestNucleic.baseLetter ? ` · ${polymerContextSnapshot.nearestNucleic.baseLetter}` : ""}`}
                />
              ) : (
                <Row k="Nearest NT" v="none in radius" />
              )}
              <div className="font-mono text-[8px] uppercase tracking-wide text-[#8A8A8A]">Top candidate atom pairs</div>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap border border-[#2A2A2A] bg-[#0A0A0A] p-1.5 font-mono text-[8px] text-[#B0B0B0]">
                {polymerContextSnapshot.candidatePairSummaries.length
                  ? polymerContextSnapshot.candidatePairSummaries.join("\n")
                  : "—"}
              </pre>
              <div className="font-mono text-[8px] uppercase tracking-wide text-[#8A8A8A]">Protein snippets</div>
              <pre className="max-h-24 overflow-auto whitespace-pre-wrap border border-[#2A2A2A] bg-[#0A0A0A] p-1.5 font-mono text-[9px] text-[#C8C8C8]">
                {Object.keys(polymerContextSnapshot.proteinSnippets).length
                  ? Object.entries(polymerContextSnapshot.proteinSnippets)
                      .map(([c, s]) => `${c}: ${s}`)
                      .join("\n")
                  : "—"}
              </pre>
              <div className="font-mono text-[8px] uppercase tracking-wide text-[#8A8A8A]">Nucleic snippets</div>
              <pre className="max-h-24 overflow-auto whitespace-pre-wrap border border-[#2A2A2A] bg-[#0A0A0A] p-1.5 font-mono text-[9px] text-[#C8C8C8]">
                {Object.keys(polymerContextSnapshot.nucleicSnippets).length
                  ? Object.entries(polymerContextSnapshot.nucleicSnippets)
                      .map(([c, s]) => `${c}: ${s}`)
                      .join("\n")
                  : "—"}
              </pre>
            </>
          )}
        </Section>

        <Section title="Entity inspector">
          <Row k="Lanes" v={polymerMock.entityLanes} />
          <Row k="Assembly" v="placeholder — import BIounit metadata" />
        </Section>

        <Section title="Biological" defaultOpen={false}>
          <Row k="Function" v="not fetched" />
          <Row k="Family" v="—" />
          <Row k="Localization" v="—" />
          <Row k="Binding" v="—" />
        </Section>

        <Section title="Confidence" defaultOpen>
          <div className="space-y-2 border border-[#2A2A2A] bg-[#0A0A0A] p-2">
            <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#6A6A6A]">
              pLDDT / B-factor ramp
            </div>
            <div
              className="h-2.5 w-full border border-[#2A2A2A]"
              style={{
                background:
                  "linear-gradient(90deg, #303030 0%, #6A6F74 35%, #9EA8B0 65%, #D2D6DC 100%)",
              }}
            />
            <div className="flex justify-between font-mono text-[8px] text-[#5A5A5A]">
              <span>Disordered</span>
              <span>Uncertain</span>
              <span>Confident</span>
            </div>
            <Row k="Source" v={proteinSelection?.preferredStructure === "alphafold" ? "AFDB (B-factor)" : "Experimental B / N/A"} />
            <Row k="Active scheme" v={colorScheme} />
            <button
              type="button"
              onClick={() => runViewerCommand("overlay.confidence.toggle")}
              className="w-full border border-[#2A2A2A] bg-[#141414] py-1 font-mono text-[9px] uppercase tracking-wide text-[#9A9A9A] hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
            >
              {colorScheme === "bfactor" || colorScheme === "bfactor_gray"
                ? "Clear heatmap"
                : "Apply confidence heatmap"}
            </button>
          </div>
        </Section>

        <Section title="Polymer / complex" defaultOpen>
          <Row k="Chain IDs" v={polymerMock.subunits} />
          <Row k="Interfaces" v={polymerMock.interfaces} />
          <Row k="H-bonds" v={polymerMock.hbonds} />
          <Row k="Salt bridges" v={polymerMock.salt} />
          <Row k="Hydrophobic" v={polymerMock.hp} />
          <div className="flex flex-col gap-1 py-0.5">
            <span className="w-[40%] font-mono text-[10px] uppercase tracking-wide text-[#8A8A8A]">
              Bio assembly
            </span>
            <select
              value={assemblyPick}
              onChange={(e) => setAssemblyPick(e.target.value)}
              disabled={!structureModel}
              className="border border-[#2A2A2A] bg-[#0A0A0A] px-1.5 py-1 font-mono text-[10px] text-[#F2F2F2] disabled:opacity-40"
            >
              <option value="asu">Asymmetric unit</option>
              <option value="bio1">Biological assembly 1 (RCSB metadata N/A)</option>
              <option value="bio2">Biological assembly 2 (stub)</option>
            </select>
          </div>
          <Row k="Stoichiometry (heuristic)" v={polymerMock.stoich} />
          <Row k="Symmetry" v={polymerMock.symmetry} />
          <Row k="Iface area (Å²)" v={polymerMock.ifaceArea} />
          <Row k="ΔG_bind (mock)" v={polymerMock.bindEnergy} />
          <Row k="Interactions" v={polymerMock.ixnCount} />
        </Section>

        <Section title="Interaction graph" defaultOpen={false}>
          {!polymerContextSnapshot?.proximityGraphEdges?.length ? (
            <p className="border border-[#2A2A2A] bg-[#0A0A0A] p-2 font-mono text-[9px] leading-snug text-[#7A7A7A]">
              Pick a residue with both protein and nucleic neighbors in context to populate the proximity graph (≤5 Å
              heavy-atom residue pairs).
            </p>
          ) : (
            <PolymerProximityGraph
              edges={polymerContextSnapshot.proximityGraphEdges}
              fingerprint={polymerContextSnapshot.contextFingerprint}
            />
          )}
        </Section>

        <Section title="Simulation" defaultOpen={false}>
          <Row k="MD engine" v="not connected" />
          <Row k="Folding run" v="placeholder trajectory slot" />
          <Row k="Docking" v="placeholder pose stack" />
          <Row k="Mutagenesis" v="future variant grid" />
          <p className="font-mono text-[8px] leading-tight text-[#5A5A5A]">
            Types reserved in client/src/lib/futureWorkspace.ts (idle hooks).
          </p>
        </Section>
      </div>
    </div>
  );
}
