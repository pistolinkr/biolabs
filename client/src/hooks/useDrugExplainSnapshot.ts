import { useEffect, useState } from "react";
import {
  getDrugExplainSnapshot,
  subscribeDrugExplain,
  type DrugExplainSnapshot,
} from "@/lib/phaeleon/phaeleonDrugExplainCache";

export function useDrugExplainSnapshot(cacheKey: string | null): DrugExplainSnapshot {
  const [snapshot, setSnapshot] = useState<DrugExplainSnapshot>(() =>
    cacheKey ? getDrugExplainSnapshot(cacheKey) : { status: "idle", content: null, error: null },
  );

  useEffect(() => {
    if (!cacheKey) {
      setSnapshot({ status: "idle", content: null, error: null });
      return;
    }
    setSnapshot(getDrugExplainSnapshot(cacheKey));
    return subscribeDrugExplain(cacheKey, setSnapshot);
  }, [cacheKey]);

  return snapshot;
}
