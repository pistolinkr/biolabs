import { useEffect, useState } from "react";

/** Progressive reveal — simulates live translation typing. */
export function useLiveRevealText(fullText: string, active: boolean, charMs = 14): string {
  const [visibleCount, setVisibleCount] = useState(active ? 0 : fullText.length);

  useEffect(() => {
    if (!active) {
      setVisibleCount(fullText.length);
      return;
    }

    setVisibleCount(0);
    if (!fullText) return;

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleCount(index);
      if (index >= fullText.length) {
        window.clearInterval(timer);
      }
    }, charMs);

    return () => window.clearInterval(timer);
  }, [fullText, active, charMs]);

  return fullText.slice(0, visibleCount);
}
