import React, { ReactNode } from 'react';
import StructureViewport from '@/components/StructureViewport';

interface ViewportContainerProps {
  children?: ReactNode;
  className?: string;
}

/**
 * Biolabs Viewport Container
 *
 * Central WebGL viewport for molecular simulation and protein visualization
 * - Flexible sizing to fill available space
 * - Dark background for 3D rendering
 * - Minimal UI overlay
 */
export default function ViewportContainer({
  children,
  className = '',
}: ViewportContainerProps) {
  return (
    <div
      className={`w-full h-full min-h-0 min-w-0 flex items-stretch justify-stretch overflow-hidden bg-[var(--viewport-background)] ${className}`}
    >
      {children ?? <StructureViewport className="flex-1" />}
    </div>
  );
}
