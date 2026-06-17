import type { InteractionRisk } from "@/lib/phaeleon/types";
import { cn } from "@/lib/utils";

export function interactionRiskMarkClass(risk: InteractionRisk): string {
  switch (risk) {
    case "low":
      return "text-green-600";
    case "moderate":
      return "text-yellow-500";
    case "high":
      return "text-orange-500";
    case "very_high":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
}

/** Risk exclamation marks — moderate: !!, high/caution tiers: !!! */
export function interactionRiskMarkContent(risk: InteractionRisk): string {
  switch (risk) {
    case "moderate":
      return "!!";
    case "high":
    case "very_high":
      return "!!!";
    case "low":
      return "!";
    default:
      return "!!";
  }
}

/** Binary rail risk indicator — colored exclamation marks only. */
export default function PhaeleonInteractionRiskMark({
  risk,
  className,
}: {
  risk: InteractionRisk;
  className?: string;
}) {
  const marks = interactionRiskMarkContent(risk);

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-mono text-xl font-black leading-none tracking-tighter",
        interactionRiskMarkClass(risk),
        className,
      )}
    >
      {marks}
    </span>
  );
}
