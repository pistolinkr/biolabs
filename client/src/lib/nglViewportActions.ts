import type { Stage, StructureComponent } from "ngl";

export function nglResetView(stage: Stage | null): void {
  if (!stage) return;
  try {
    const vc = (stage as unknown as { viewerControls?: { reset: () => void } }).viewerControls;
    vc?.reset?.();
  } catch {
    /* ignore */
  }
  try {
    stage.autoView();
  } catch {
    /* ignore */
  }
}

export function nglFitStructure(stage: Stage | null, sc: StructureComponent | null): void {
  if (!stage) return;
  try {
    if (sc) sc.autoView();
    else stage.autoView();
  } catch {
    try {
      stage.autoView();
    } catch {
      /* ignore */
    }
  }
}

/** App residue key from sequence strip / picks: `CHAIN:resno` → NGL-style attempts. */
function nglSeleCandidatesFromAppResidueKey(key: string): string[] {
  const raw = key.trim();
  const m = /^([^:]+):(\d+)$/.exec(raw);
  if (!m) return [raw];
  const [, chain, resno] = m;
  return [`${resno}:${chain}`, `${resno} and :${chain}`, `/${resno}:${chain}`, raw];
}

/** Fit isolate chain, residue key (NGL sele), or full structure. */
export function nglFitSelection(
  stage: Stage | null,
  sc: StructureComponent | null,
  isolateChainId: string | null,
  selectedResidueKey: string | null,
): void {
  if (!stage || !sc) return;
  try {
    if (selectedResidueKey?.trim()) {
      const tries = nglSeleCandidatesFromAppResidueKey(selectedResidueKey);
      for (const sele of tries) {
        try {
          sc.autoView(sele, 0);
          return;
        } catch {
          /* try next */
        }
      }
      sc.autoView();
      return;
    }
    if (isolateChainId) {
      sc.autoView(`:${isolateChainId}`, 0);
      return;
    }
    sc.autoView();
  } catch {
    try {
      stage.autoView();
    } catch {
      /* ignore */
    }
  }
}

export async function nglScreenshotToFile(
  stage: Stage | null,
  filename = "biolabs-viewport.png",
): Promise<boolean> {
  if (!stage) return false;
  try {
    const blob = await stage.makeImage({
      factor: 1,
      antialias: true,
      trim: false,
      transparent: false,
    });
    if (!blob || blob.size === 0) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    /* NGL 2.x: viewer.canvas is not exposed; makeImage is the supported path. */
    return false;
  }
}
