import type { Stage, StructureComponent } from "ngl";
import { Vector3 } from "ngl";
import type {
  PolymerContextSnapshot,
  PolymerProximityGraphEdge,
  SequencePolymerKind,
  ViewportPickDetail,
} from "@/contexts/ViewerContext";

/** Must match ViewerContext SequencePolymerKind — kept local to avoid circular imports. */
export type NglSequencePolymerKind = "protein" | "nucleic";

const REPR_PREFIX = "bioSeqNbhd";
const IXN_PREFIX = "bioIxn";
const NUC_PRESET_PREFIX = "bioNucPreset";

/** Legacy default when radius is not passed (sequence-only callers). */
export const DEFAULT_NEIGHBOR_RADIUS = 3.0;

export function parseChainResidueKey(key: string): { chain: string; index: number } | null {
  const m = /^([^:]+):(\d+)$/.exec(key.trim());
  if (!m) return null;
  const chain = m[1];
  const index = Number(m[2]);
  if (!Number.isFinite(index) || index < 1) return null;
  return { chain, index };
}

export function removeBiSeqHighlights(sc: StructureComponent): void {
  const list = [...sc.reprList];
  for (const repr of list) {
    try {
      const name = (repr as { name?: string }).name ?? "";
      if (name.startsWith(REPR_PREFIX)) {
        sc.removeRepresentation(repr);
      }
    } catch {
      /* */
    }
  }
}

export function removeInteractionOverlays(sc: StructureComponent): void {
  const list = [...sc.reprList];
  for (const repr of list) {
    try {
      const name = (repr as { name?: string }).name ?? "";
      if (name.startsWith(IXN_PREFIX)) {
        sc.removeRepresentation(repr);
      }
    } catch {
      /* */
    }
  }
}

export function removeNucleicPresetRepresentations(sc: StructureComponent): void {
  const list = [...sc.reprList];
  for (const repr of list) {
    try {
      const name = (repr as { name?: string }).name ?? "";
      if (name.startsWith(NUC_PRESET_PREFIX)) {
        sc.removeRepresentation(repr);
      }
    } catch {
      /* */
    }
  }
}

export function applyNucleicBackboneAccent(sc: StructureComponent): void {
  try {
    sc.addRepresentation("line", {
      sele: "nucleic",
      name: `${NUC_PRESET_PREFIX}Line`,
      color: "#6A6A6A",
      linewidth: 1,
      opacity: 0.55,
    } as never);
  } catch {
    /* */
  }
}

/**
 * Proximity highlight — monochrome workstation cartoon + element ball+stick.
 */
export function applyBiSeqHighlights(sc: StructureComponent, sele: string): void {
  const s = sele.trim();
  if (!s) return;
  try {
    sc.addRepresentation("ball+stick", {
      sele: s,
      name: `${REPR_PREFIX}Ball`,
      color: "element",
      multipleBond: true,
      scale: 2.5,
    } as never);
    sc.addRepresentation("cartoon", {
      sele: s,
      name: `${REPR_PREFIX}Cartoon`,
      color: "#8A6A6A",
      opacity: 0.82,
    } as never);
  } catch {
    /* */
  }
}

type AtomLike = { x: number; y: number; z: number };

function residueReferenceCoords(
  rp: {
    getAtomByName?: (n: string) => AtomLike | undefined;
    eachAtom?: (cb: (a: AtomLike & { atomname?: string }) => void) => void;
  },
  kind: NglSequencePolymerKind,
): AtomLike | null {
  if (kind === "protein") {
    const ca = rp.getAtomByName?.("CA");
    if (ca) return { x: ca.x, y: ca.y, z: ca.z };
  } else {
    const c1 = rp.getAtomByName?.("C1'");
    if (c1) return { x: c1.x, y: c1.y, z: c1.z };
    const p = rp.getAtomByName?.("P");
    if (p) return { x: p.x, y: p.y, z: p.z };
  }
  let out: AtomLike | null = null;
  rp.eachAtom?.((a) => {
    if (!out) out = { x: a.x, y: a.y, z: a.z };
  });
  return out;
}

export interface NeighborResidueRef {
  chainname: string;
  resno: number;
}

/**
 * Map sequence-strip ordinal (1..N, same order as structureModelFromNgl) to reference-atom coords.
 */
export function resolveStripIndexToReferenceCoords(
  sc: StructureComponent,
  chainId: string,
  oneBasedIndex: number,
  kind: NglSequencePolymerKind,
): AtomLike | null {
  let found: AtomLike | null = null;
  let n = 0;
  sc.structure.eachChain((cp) => {
    if (found || cp.chainname !== chainId) return;
    cp.eachResidue((rp) => {
      if (found) return;
      const ok = kind === "protein" ? rp.isStandardAminoacid() : rp.isNucleic();
      if (!ok) return;
      n += 1;
      if (n !== oneBasedIndex) return;
      found = residueReferenceCoords(rp, kind);
    });
  });
  return found;
}

/** Count nucleic polymer position (1-based) for a PDB `resno` on a chain. */
export function nucleicStripOrdinalForResno(
  sc: StructureComponent,
  chainId: string,
  pdbResno: number,
): number | null {
  let n = 0;
  let found: number | null = null;
  sc.structure.eachChain((cp) => {
    if (cp.chainname !== chainId) return;
    cp.eachResidue((rp) => {
      if (!rp.isNucleic()) return;
      n += 1;
      if (rp.resno === pdbResno) found = n;
    });
  });
  return found;
}

function collectNeighborResiduesBrute(
  sc: StructureComponent,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
): NeighborResidueRef[] {
  const map = new Map<string, NeighborResidueRef>();
  const r2 = radius * radius;
  sc.structure.eachAtom((atom: { x: number; y: number; z: number; resno: number; chainname: string }) => {
    const dx = atom.x - cx;
    const dy = atom.y - cy;
    const dz = atom.z - cz;
    if (dx * dx + dy * dy + dz * dz <= r2) {
      const k = `${atom.chainname}:${atom.resno}`;
      if (!map.has(k)) {
        map.set(k, { chainname: atom.chainname, resno: atom.resno });
      }
    }
  });
  return Array.from(map.values());
}

/**
 * Spatial hash for large structures — same residue set as brute force, fewer distance checks.
 */
function collectNeighborResiduesGrid(
  sc: StructureComponent,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
): NeighborResidueRef[] {
  type AtomLite = { x: number; y: number; z: number; resno: number; chainname: string };
  const cellSize = Math.max(radius / 2, 2.5);
  const grid = new Map<string, AtomLite[]>();
  sc.structure.eachAtom((atom: AtomLite) => {
    const ix = Math.floor(atom.x / cellSize);
    const iy = Math.floor(atom.y / cellSize);
    const iz = Math.floor(atom.z / cellSize);
    const ck = `${ix},${iy},${iz}`;
    const bucket = grid.get(ck);
    if (bucket) bucket.push(atom);
    else grid.set(ck, [atom]);
  });
  const nearby = new Map<string, NeighborResidueRef>();
  const r2 = radius * radius;
  const icx = Math.floor(cx / cellSize);
  const icy = Math.floor(cy / cellSize);
  const icz = Math.floor(cz / cellSize);
  const nCells = Math.ceil(radius / cellSize) + 1;
  for (let di = -nCells; di <= nCells; di++) {
    for (let dj = -nCells; dj <= nCells; dj++) {
      for (let dk = -nCells; dk <= nCells; dk++) {
        const bucket = grid.get(`${icx + di},${icy + dj},${icz + dk}`);
        if (!bucket) continue;
        for (const atom of bucket) {
          const dx = atom.x - cx;
          const dy = atom.y - cy;
          const dz = atom.z - cz;
          if (dx * dx + dy * dy + dz * dz <= r2) {
            const k = `${atom.chainname}:${atom.resno}`;
            if (!nearby.has(k)) {
              nearby.set(k, { chainname: atom.chainname, resno: atom.resno });
            }
          }
        }
      }
    }
  }
  return Array.from(nearby.values());
}

const GRID_NEIGHBOR_ATOM_THRESHOLD = 28_000;

export function collectNeighborResidues(
  sc: StructureComponent,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
): NeighborResidueRef[] {
  const n = sc.structure.atomCount ?? 0;
  if (n >= GRID_NEIGHBOR_ATOM_THRESHOLD) {
    return collectNeighborResiduesGrid(sc, cx, cy, cz, radius);
  }
  return collectNeighborResiduesBrute(sc, cx, cy, cz, radius);
}

export function neighborSelectionStringFromRefs(refs: NeighborResidueRef[]): string {
  if (!refs.length) return "";
  return refs.map((r) => `${r.resno} and :${r.chainname}`).join(" OR ");
}

export function buildNeighborSelectionString(
  sc: StructureComponent,
  cx: number,
  cy: number,
  cz: number,
  radius = DEFAULT_NEIGHBOR_RADIUS,
): string {
  const refs = collectNeighborResidues(sc, cx, cy, cz, radius);
  return neighborSelectionStringFromRefs(refs);
}

type ClassifiedResidue = {
  classify: () => "protein" | "nucleic" | "other";
  refCoords: (kind: NglSequencePolymerKind) => AtomLike | null;
};

function findResidueForRef(sc: StructureComponent, ref: NeighborResidueRef): ClassifiedResidue | null {
  let hit: ClassifiedResidue | null = null;
  sc.structure.eachChain((cp) => {
    if (cp.chainname !== ref.chainname || hit) return;
    cp.eachResidue((rp) => {
      if (hit || rp.resno !== ref.resno) return;
      hit = {
        classify: () => {
          if (rp.isStandardAminoacid()) return "protein";
          if (rp.isNucleic()) return "nucleic";
          return "other";
        },
        refCoords: (kind) => residueReferenceCoords(rp, kind),
      };
    });
  });
  return hit;
}

function classifyNeighborRef(sc: StructureComponent, ref: NeighborResidueRef): "protein" | "nucleic" | "other" {
  return findResidueForRef(sc, ref)?.classify() ?? "other";
}

const POLAR_CUTOFF = 3.5;
const HEAVY_CONTACT_CUTOFF = 4.0;
const RESIDUE_EDGE_CUTOFF = 5.0;
const MAX_CONTEXT_ATOMS_PER_SIDE = 220;
const MAX_DISTANCE_REPR_PAIRS = 72;

interface CtxAtom {
  index: number;
  x: number;
  y: number;
  z: number;
  el: string;
  chain: string;
  resno: number;
  atomname: string;
}

function dist2(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function collectContextHeavyAtoms(
  sc: StructureComponent,
  refs: NeighborResidueRef[],
  center: { x: number; y: number; z: number },
): { protein: CtxAtom[]; nucleic: CtxAtom[] } {
  const refSet = new Set(refs.map((r) => `${r.chainname}\x00${r.resno}`));
  const protein: CtxAtom[] = [];
  const nucleic: CtxAtom[] = [];
  sc.structure.eachChain((cp) => {
    cp.eachResidue((rp) => {
      if (!refSet.has(`${cp.chainname}\x00${rp.resno}`)) return;
      const isP = rp.isStandardAminoacid();
      const isN = rp.isNucleic();
      if (!isP && !isN) return;
      rp.eachAtom((ap: { index: number; x: number; y: number; z: number; element: string; atomname: string }) => {
        if (ap.element === "H" || ap.element === "D") return;
        const row: CtxAtom = {
          index: ap.index,
          x: ap.x,
          y: ap.y,
          z: ap.z,
          el: ap.element,
          chain: cp.chainname,
          resno: rp.resno,
          atomname: ap.atomname,
        };
        if (isP) protein.push(row);
        if (isN) nucleic.push(row);
      });
    });
  });
  const trim = (arr: CtxAtom[]): CtxAtom[] => {
    if (arr.length <= MAX_CONTEXT_ATOMS_PER_SIDE) return arr;
    return [...arr]
      .sort((a, b) => dist2(a, center) - dist2(b, center))
      .slice(0, MAX_CONTEXT_ATOMS_PER_SIDE);
  };
  return { protein: trim(protein), nucleic: trim(nucleic) };
}

export interface CandidateAtomPair {
  a: CtxAtom;
  b: CtxAtom;
  dist: number;
  polar: boolean;
  phosphateTouch: boolean;
}

export function computeCandidateInteractionPairs(
  sc: StructureComponent,
  refs: NeighborResidueRef[],
  center: { x: number; y: number; z: number },
): CandidateAtomPair[] {
  const { protein, nucleic } = collectContextHeavyAtoms(sc, refs, center);
  if (!protein.length || !nucleic.length) return [];
  const out: CandidateAtomPair[] = [];
  for (const p of protein) {
    for (const n of nucleic) {
      const d = Math.sqrt(dist2(p, n));
      if (d > HEAVY_CONTACT_CUTOFF) continue;
      const polar =
        (p.el === "N" || p.el === "O") &&
        (n.el === "N" || n.el === "O") &&
        d <= POLAR_CUTOFF;
      const phosphateTouch = p.el === "P" || n.el === "P";
      out.push({ a: p, b: n, dist: d, polar, phosphateTouch });
    }
  }
  out.sort((u, v) => u.dist - v.dist);
  return out.slice(0, 160);
}

export function applyInteractionDistanceOverlay(sc: StructureComponent, pairs: CandidateAtomPair[]): void {
  const take = pairs.filter((p) => p.dist <= HEAVY_CONTACT_CUTOFF).slice(0, MAX_DISTANCE_REPR_PAIRS);
  removeInteractionOverlays(sc);
  if (!take.length) return;
  const atomPair: number[][] = take.map((p) => [p.a.index, p.b.index]);
  try {
    sc.addRepresentation("distance", {
      name: `${IXN_PREFIX}Polar`,
      atomPair,
      labelVisible: false,
      labelUnit: "angstrom",
      color: "#8A8A8A",
      linewidth: 1,
      lineOpacity: 0.42,
      useCylinder: false,
    } as never);
  } catch {
    /* */
  }
}

function collectHeavyAtomsForResidue(
  sc: StructureComponent,
  ref: NeighborResidueRef,
): Array<{ x: number; y: number; z: number }> {
  const out: Array<{ x: number; y: number; z: number }> = [];
  sc.structure.eachChain((cp) => {
    if (cp.chainname !== ref.chainname) return;
    cp.eachResidue((rp) => {
      if (rp.resno !== ref.resno) return;
      rp.eachAtom((ap: { x: number; y: number; z: number; element: string }) => {
        if (ap.element === "H" || ap.element === "D") return;
        out.push({ x: ap.x, y: ap.y, z: ap.z });
      });
    });
  });
  return out;
}

function minHeavyDistanceBetweenResidues(
  sc: StructureComponent,
  a: NeighborResidueRef,
  b: NeighborResidueRef,
): number | null {
  const atomsA = collectHeavyAtomsForResidue(sc, a);
  const atomsB = collectHeavyAtomsForResidue(sc, b);
  if (!atomsA.length || !atomsB.length) return null;
  let best = Infinity;
  for (const p of atomsA) {
    for (const q of atomsB) {
      const d = Math.sqrt(dist2(p, q));
      if (d < best) best = d;
    }
  }
  return best === Infinity ? null : best;
}

function buildProximityGraphEdges(
  sc: StructureComponent,
  refs: NeighborResidueRef[],
  maxEdges: number,
): PolymerProximityGraphEdge[] {
  const prot = refs.filter((r) => classifyNeighborRef(sc, r) === "protein");
  const nuc = refs.filter((r) => classifyNeighborRef(sc, r) === "nucleic");
  if (!prot.length || !nuc.length) return [];
  const raw: PolymerProximityGraphEdge[] = [];
  for (const p of prot) {
    for (const n of nuc) {
      const d = minHeavyDistanceBetweenResidues(sc, p, n);
      if (d !== null && d <= RESIDUE_EDGE_CUTOFF) {
        raw.push({
          proteinChain: p.chainname,
          proteinResno: p.resno,
          nucleicChain: n.chainname,
          nucleicResno: n.resno,
          minHeavyDistanceAngstrom: Math.round(d * 1000) / 1000,
        });
      }
    }
  }
  raw.sort((u, v) => u.minHeavyDistanceAngstrom - v.minHeavyDistanceAngstrom);
  const seen = new Set<string>();
  const deduped: PolymerProximityGraphEdge[] = [];
  for (const e of raw) {
    const k = `${e.proteinChain}:${e.proteinResno}|${e.nucleicChain}:${e.nucleicResno}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(e);
    if (deduped.length >= maxEdges) break;
  }
  return deduped;
}

function summarizePairs(pairs: CandidateAtomPair[], maxLines: number): string[] {
  const lines: string[] = [];
  for (const p of pairs) {
    if (lines.length >= maxLines) break;
    lines.push(
      `:${p.a.chain} ${p.a.resno} ${p.a.atomname} (${p.a.el}) ↔ :${p.b.chain} ${p.b.resno} ${p.b.atomname} (${p.b.el})  ${p.dist.toFixed(2)} Å${p.polar ? "  polar?" : ""}`,
    );
  }
  return lines;
}

function contextFingerprintFor(title: string, radius: number, sele: string): string {
  const t = title.trim() || "untitled";
  const s = sele.length > 96 ? sele.slice(0, 96) : sele;
  return `${t}|r${radius}|${s}`;
}

export function boundingRadiusFromContext(
  sc: StructureComponent,
  refs: NeighborResidueRef[],
  center: { x: number; y: number; z: number },
): number {
  const refSet = new Set(refs.map((r) => `${r.chainname}\x00${r.resno}`));
  let maxD2 = 2.25;
  sc.structure.eachChain((cp) => {
    cp.eachResidue((rp) => {
      if (!refSet.has(`${cp.chainname}\x00${rp.resno}`)) return;
      rp.eachAtom((ap: { x: number; y: number; z: number }) => {
        const d2 = dist2(ap, center);
        if (d2 > maxD2) maxD2 = d2;
      });
    });
  });
  return Math.sqrt(maxD2);
}

const NUC_SNIP: Record<string, string> = {
  A: "A",
  C: "C",
  G: "G",
  T: "T",
  U: "U",
  DA: "A",
  DC: "C",
  DG: "G",
  DT: "T",
  DU: "U",
  RA: "A",
  RC: "C",
  RG: "G",
  RU: "U",
  ADE: "A",
  CYT: "C",
  GUA: "G",
  THY: "T",
  URA: "U",
};

function nucleicLetter(rp: { resname: string; getResname1: () => string; isNucleic: () => boolean }): string {
  if (!rp.isNucleic()) return "";
  try {
    const one = rp.getResname1()?.trim();
    if (one && /^[ACGTU]$/i.test(one)) return one.toUpperCase();
  } catch {
    /* */
  }
  const key = (rp.resname ?? "").trim().toUpperCase();
  return NUC_SNIP[key] ?? "?";
}

function snippetAlongChain(
  sc: StructureComponent,
  chainId: string,
  resSet: Set<number>,
  kind: "protein" | "nucleic",
): string {
  let s = "";
  sc.structure.eachChain((cp) => {
    if (cp.chainname !== chainId) return;
    cp.eachResidue((rp) => {
      if (!resSet.has(rp.resno)) return;
      if (kind === "protein" && rp.isStandardAminoacid()) s += rp.getResname1();
      else if (kind === "nucleic" && rp.isNucleic()) s += nucleicLetter(rp);
    });
  });
  return s;
}

export function buildPolymerContextSnapshot(
  sc: StructureComponent,
  center: { x: number; y: number; z: number },
  radiusAngstrom: number,
  refs: NeighborResidueRef[],
  structureTitle: string,
  pairCandidates: CandidateAtomPair[],
): PolymerContextSnapshot | null {
  const sele = neighborSelectionStringFromRefs(refs);
  if (!sele.trim()) return null;

  const chains = new Set<string>();
  const nucleicChains = new Set<string>();
  let proteinResidueCount = 0;
  let nucleicResidueCount = 0;
  let otherResidueCount = 0;

  const byChainRes = new Map<string, Set<number>>();
  for (const r of refs) {
    chains.add(r.chainname);
    const g = byChainRes.get(r.chainname) ?? new Set<number>();
    g.add(r.resno);
    byChainRes.set(r.chainname, g);
    const cls = classifyNeighborRef(sc, r);
    if (cls === "protein") proteinResidueCount += 1;
    else if (cls === "nucleic") {
      nucleicResidueCount += 1;
      nucleicChains.add(r.chainname);
    } else otherResidueCount += 1;
  }

  const proteinSnippets: Record<string, string> = {};
  const nucleicSnippets: Record<string, string> = {};
  for (const cid of chains) {
    const resSet = byChainRes.get(cid) ?? new Set();
    const p = snippetAlongChain(sc, cid, resSet, "protein");
    const n = snippetAlongChain(sc, cid, resSet, "nucleic");
    if (p) proteinSnippets[cid] = p.slice(0, 64);
    if (n) nucleicSnippets[cid] = n.slice(0, 64);
  }

  let nearestNucleic: PolymerContextSnapshot["nearestNucleic"] = null;
  let bestD2 = Infinity;
  for (const r of refs) {
    const rs = findResidueForRef(sc, r);
    if (!rs || rs.classify() !== "nucleic") continue;
    const pos = rs.refCoords("nucleic");
    if (!pos) continue;
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    const dz = pos.z - center.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < bestD2) {
      bestD2 = d2;
      const stripOrdinal = nucleicStripOrdinalForResno(sc, r.chainname, r.resno) ?? 1;
      let baseLetter: string | undefined;
      sc.structure.eachChain((cp) => {
        if (cp.chainname !== r.chainname) return;
        cp.eachResidue((rp) => {
          if (rp.resno !== r.resno) return;
          if (rp.isNucleic()) {
            const letter = nucleicLetter(rp);
            if (letter) baseLetter = letter;
          }
        });
      });
      nearestNucleic = {
        chainId: r.chainname,
        pdbResno: r.resno,
        stripOrdinal,
        baseLetter,
      };
    }
  }

  const candidateHeavyContactCount = pairCandidates.filter((p) => p.dist <= HEAVY_CONTACT_CUTOFF).length;
  const candidatePolarContactCount = pairCandidates.filter((p) => p.polar).length;
  const candidatePhosphateContactCount = pairCandidates.filter((p) => p.phosphateTouch && p.dist <= HEAVY_CONTACT_CUTOFF)
    .length;
  const candidatePairSummaries = summarizePairs(pairCandidates, 6);
  const proximityGraphEdges = buildProximityGraphEdges(sc, refs, 20);
  const contextFingerprint = contextFingerprintFor(structureTitle, radiusAngstrom, sele);

  return {
    center: { x: center.x, y: center.y, z: center.z },
    radiusAngstrom,
    sele,
    chainsTouched: Array.from(chains).sort(),
    nucleicChains: Array.from(nucleicChains).sort(),
    proteinResidueCount,
    nucleicResidueCount,
    otherResidueCount,
    proteinSnippets,
    nucleicSnippets,
    nearestNucleic,
    candidateHeavyContactCount,
    candidatePolarContactCount,
    candidatePhosphateContactCount,
    candidatePairSummaries,
    proximityGraphEdges,
    contextFingerprint,
  };
}

function coordsFromViewportResidue(sc: StructureComponent, detail: ViewportPickDetail): AtomLike | null {
  let found: AtomLike | null = null;
  sc.structure.eachChain((cp) => {
    if (found || cp.chainname !== detail.chain) return;
    cp.eachResidue((rp) => {
      if (found || rp.resno !== detail.resno) return;
      if (rp.isStandardAminoacid()) {
        found = residueReferenceCoords(rp, "protein");
      } else if (rp.isNucleic()) {
        found = residueReferenceCoords(rp, "nucleic");
      } else {
        found = residueReferenceCoords(rp, "protein") ?? residueReferenceCoords(rp, "nucleic");
      }
    });
  });
  return found;
}

export function resolvePolymerHighlightCenter(
  sc: StructureComponent,
  viewportPick: ViewportPickDetail | null,
  selectedResidueKey: string | null,
  selectedSequencePolymerKind: SequencePolymerKind | null,
): AtomLike | null {
  if (
    viewportPick &&
    viewportPick.x != null &&
    viewportPick.y != null &&
    viewportPick.z != null &&
    Number.isFinite(viewportPick.x) &&
    Number.isFinite(viewportPick.y) &&
    Number.isFinite(viewportPick.z)
  ) {
    return { x: viewportPick.x, y: viewportPick.y, z: viewportPick.z };
  }
  if (selectedSequencePolymerKind && selectedResidueKey) {
    const parsed = parseChainResidueKey(selectedResidueKey);
    if (!parsed) return null;
    return resolveStripIndexToReferenceCoords(sc, parsed.chain, parsed.index, selectedSequencePolymerKind);
  }
  if (viewportPick) {
    return coordsFromViewportResidue(sc, viewportPick);
  }
  return null;
}

export function applyPolymerContextHighlight(
  sc: StructureComponent,
  stage: Stage | null,
  opts: {
    viewportPick: ViewportPickDetail | null;
    selectedResidueKey: string | null;
    selectedSequencePolymerKind: SequencePolymerKind | null;
    contactRadius: number;
    contactPreset: number;
    moveCamera: boolean;
    showInteractionOverlay: boolean;
    nucleicBackboneAccent: boolean;
    structureTitle: string;
  },
): PolymerContextSnapshot | null {
  removeBiSeqHighlights(sc);
  removeInteractionOverlays(sc);
  removeNucleicPresetRepresentations(sc);
  const center = resolvePolymerHighlightCenter(
    sc,
    opts.viewportPick,
    opts.selectedResidueKey,
    opts.selectedSequencePolymerKind,
  );
  if (!center) return null;
  const refs = collectNeighborResidues(sc, center.x, center.y, center.z, opts.contactRadius);
  const sele = neighborSelectionStringFromRefs(refs);
  if (!sele.trim()) return null;
  applyBiSeqHighlights(sc, sele);
  const pairCandidates = computeCandidateInteractionPairs(sc, refs, center);
  const snap = buildPolymerContextSnapshot(
    sc,
    center,
    opts.contactRadius,
    refs,
    opts.structureTitle,
    pairCandidates,
  );
  if (opts.showInteractionOverlay) {
    applyInteractionDistanceOverlay(sc, pairCandidates);
  }
  if (opts.nucleicBackboneAccent) {
    applyNucleicBackboneAccent(sc);
  }
  if (opts.moveCamera && stage && snap) {
    const extentR = boundingRadiusFromContext(sc, refs, center);
    const presetR = cameraRadiusForContactPreset(opts.contactPreset);
    const cameraR = Math.min(28, Math.max(presetR, extentR * 1.22));
    moveStageToward(stage, center.x, center.y, center.z, 1000, cameraR);
  }
  return snap;
}

export function cameraRadiusForContactPreset(preset: number): number {
  if (preset === 4) return 6;
  if (preset === 10) return 12;
  return 8;
}

export function moveStageToward(
  stage: Stage | null,
  cx: number,
  cy: number,
  cz: number,
  ms = 1000,
  cameraRadius?: number,
): void {
  if (!stage) return;
  const rad = cameraRadius ?? 8;
  try {
    const ac = (
      stage as unknown as {
        animationControls?: { move: (v: Vector3, radius: number, duration: number) => void };
      }
    ).animationControls;
    if (ac?.move) {
      ac.move(new Vector3(cx, cy, cz), rad, ms);
    } else {
      stage.autoView();
    }
  } catch {
    try {
      stage.autoView();
    } catch {
      /* */
    }
  }
}
