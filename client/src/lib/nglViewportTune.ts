import type { Stage } from "ngl";

type BBox = { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };

/** NGL fog uses 0–100 relative to scene extent; tune from bbox for readable depth without rainbow styling. */
export function applyRelativeDepthFog(stage: Stage | null, depthCueEnabled: boolean): void {
  if (!stage) return;
  try {
    if (!depthCueEnabled) {
      stage.setParameters({ fogNear: 100, fogFar: 100 } as never);
      return;
    }
    const getBox = (stage as unknown as { getBoundingBox?: () => BBox }).getBoundingBox;
    if (typeof getBox !== "function") {
      stage.setParameters({ fogNear: 100, fogFar: 100 } as never);
      return;
    }
    const box = getBox.call(stage);
    if (!box?.min || !box?.max) {
      stage.setParameters({ fogNear: 100, fogFar: 100 } as never);
      return;
    }
    const dx = box.max.x - box.min.x;
    const dy = box.max.y - box.min.y;
    const dz = box.max.z - box.min.z;
    const size = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const near = Math.max(70, Math.min(94, 94 - Math.log10(size + 1) * 7));
    stage.setParameters({ fogNear: near, fogFar: 100 } as never);
  } catch {
    try {
      stage.setParameters({ fogNear: 88, fogFar: 100 } as never);
    } catch {
      /* ignore */
    }
  }
}
