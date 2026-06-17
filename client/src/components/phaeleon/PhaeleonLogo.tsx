import React from "react";
import { useColorScheme } from "@/hooks/useColorScheme";
import { cn } from "@/lib/utils";

/** Light mark on dark UI; dark mark on light UI (files named by ink color, not theme). */
const PHAELEON_LOGO_SRC: Record<"dark" | "light", string> = {
  dark: "/phaeleon/logo_light.png",
  light: "/phaeleon/logo_dark.png",
};

const LOGO_SIZE_SCALE = 1.8;

export interface PhaeleonLogoProps {
  className?: string;
  alt?: string;
  size?: number;
  /** Decorative mark — hides from assistive tech when adjacent text names the product. */
  decorative?: boolean;
}

/** Theme-aware Phaeleon mark — picks contrasting ink for the active color scheme. */
export default function PhaeleonLogo({
  className,
  alt = "Phaeleon",
  size = 18,
  decorative = false,
}: PhaeleonLogoProps) {
  const scheme = useColorScheme();
  const displaySize = Math.round(size * LOGO_SIZE_SCALE);

  return (
    <img
      src={PHAELEON_LOGO_SRC[scheme]}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      width={displaySize}
      height={displaySize}
      className={cn("pointer-events-none shrink-0 select-none object-contain", className)}
      draggable={false}
    />
  );
}
