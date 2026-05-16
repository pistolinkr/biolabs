import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import PanelHeader from './PanelHeader';

interface PropertySection {
  id: string;
  title: string;
  expanded: boolean;
  items: Array<{ label: string; value: string | number }>;
}

/**
 * Biolabs Right Panel
 * 
 * Displays properties, metrics, and analysis data
 * - Protein/chain information
 * - Simulation metrics (temperature, energy, etc.)
 * - Selected residue properties
 * - Interaction data
 */
export default function RightPanel() {
  const [sections, setSections] = useState<PropertySection[]>([
    {
      id: 'protein-info',
      title: 'Protein Info',
      expanded: true,
      items: [
        { label: 'Name', value: 'Protein A' },
        { label: 'Chains', value: '2' },
        { label: 'Residues', value: '1,247' },
        { label: 'Atoms', value: '9,856' },
        { label: 'MW (kDa)', value: '142.3' },
      ],
    },
    {
      id: 'simulation-state',
      title: 'Simulation State',
      expanded: true,
      items: [
        { label: 'Status', value: 'Running' },
        { label: 'Time (ps)', value: '1,234.5' },
        { label: 'Temperature (K)', value: '298.15' },
        { label: 'Pressure (bar)', value: '1.013' },
        { label: 'Energy (kcal/mol)', value: '-8,942.3' },
      ],
    },
    {
      id: 'selected-residue',
      title: 'Selected Residue',
      expanded: false,
      items: [
        { label: 'Chain', value: 'A' },
        { label: 'Residue', value: 'GLU 42' },
        { label: 'Phi (°)', value: '-60.2' },
        { label: 'Psi (°)', value: '-47.1' },
        { label: 'B-factor', value: '28.4' },
      ],
    },
    {
      id: 'interaction-data',
      title: 'Interaction Data',
      expanded: false,
      items: [
        { label: 'H-Bonds', value: '12' },
        { label: 'Salt Bridges', value: '3' },
        { label: 'Hydrophobic', value: '28' },
        { label: 'Distance (Å)', value: '3.2' },
      ],
    },
  ]);

  const toggleSection = (id: string) => {
    setSections(
      sections.map((section) =>
        section.id === id ? { ...section, expanded: !section.expanded } : section
      )
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="panel-content">
        <div className="space-y-3">
          {sections.map((section) => (
            <div key={section.id} className="border border-border rounded-none">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-muted transition-colors"
              >
                {section.expanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                <span className="text-xs font-medium uppercase tracking-wider">
                  {section.title}
                </span>
              </button>

              {section.expanded && (
                <div className="px-3 py-2 space-y-1 bg-[#0F0F0F]">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-foreground font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scientific HUD Footer */}
      <div className="border-t border-border p-2 bg-[#0F0F0F] text-xs space-y-1">
        <div className="flex justify-between text-muted-foreground">
          <span>FPS</span>
          <span className="font-mono">60</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Atoms Rendered</span>
          <span className="font-mono">9,856</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Memory</span>
          <span className="font-mono">234 MB</span>
        </div>
      </div>
    </div>
  );
}
