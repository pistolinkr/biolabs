import { StructureComponent } from "ngl";

export type VizRepresentationId =
  | "cartoon"
  | "rope"
  | "ribbon"
  | "surface"
  | "ball+stick"
  | "spacefill"
  | "line"
  | "wireframe";

export type VizColorSchemeId =
  | "chainid"
  | "residueindex"
  | "hydrophobicity"
  | "bfactor"
  | "electrostatic"
  | "bfactor_gray";

/** Map UI alias IDs to NGL representation names. */
export function nglReprType(id: VizRepresentationId): string {
  if (id === "ribbon") return "rope";
  if (id === "wireframe") return "line";
  return id;
}

export function nglColorScheme(id: VizColorSchemeId): string {
  if (id === "electrostatic") return "electrostatic";
  if (id === "bfactor_gray") return "bfactor";
  return id;
}

export function clearStructureRepresentations(sc: StructureComponent): void {
  const list = [...sc.reprList];
  for (const repr of list) {
    sc.removeRepresentation(repr);
  }
}

export function applyMainRepresentation(
  sc: StructureComponent,
  repr: VizRepresentationId,
  colorScheme: VizColorSchemeId,
  options: {
    isolateChainId: string | null;
    transparent: boolean;
    opacity?: number;
  },
): void {
  clearStructureRepresentations(sc);

  const sele = options.isolateChainId ? `:${options.isolateChainId}` : "";
  const base: Record<string, unknown> = {
    colorScheme: nglColorScheme(colorScheme),
    opacity: options.transparent ? options.opacity ?? 0.85 : 1,
  };
  if (colorScheme === "bfactor_gray") {
    base.colorScale = "greys";
    base.colorReverse = true;
  }
  if (sele) (base as { sele: string }).sele = sele;

  const reprNgl = nglReprType(repr);

  if (reprNgl === "surface") {
    sc.addRepresentation("surface", {
      ...base,
      surfaceType: "av",
      probeRadius: 1.4,
    } as never);
    return;
  }

  if (reprNgl === "ball+stick") {
    sc.addRepresentation("ball+stick", {
      ...base,
      multipleBond: "symmetric",
    } as never);
    return;
  }

  sc.addRepresentation(reprNgl as never, base as never);

  const atomCount = sc.structure?.atomCount ?? 0;
  if (atomCount < 70_000) {
    try {
      sc.addRepresentation("ball+stick", {
        sele: "hetero and not (water or ion)",
        scale: 0.32,
      } as never);
    } catch {
      /* none */
    }
  }
}
