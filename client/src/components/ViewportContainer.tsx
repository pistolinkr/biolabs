import React, { ReactNode } from 'react';
import type { ProteinSelection } from '@/lib/proteinApis';
import StructureViewport from '@/components/StructureViewport';

interface ViewportContainerProps {
  children?: ReactNode;
  className?: string;
  proteinSelection?: ProteinSelection | null;
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
  proteinSelection = null,
}: ViewportContainerProps) {
  return (
    <div
      className={`w-full h-full min-h-0 min-w-0 bg-[#0A0A0A] flex items-stretch justify-stretch overflow-hidden ${className}`}
    >
      {children ?? <StructureViewport selection={proteinSelection} className="flex-1" />}
    </div>
  );
}
