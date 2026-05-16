import React, { useState } from 'react';
import { Microscope, Zap, Layers, Database } from 'lucide-react';
import ProteinViewer from './ProteinViewer';
import SimulationEngine from './SimulationEngine';
import LayerSystem from './LayerSystem';

import type { ProteinSelection } from '@/lib/proteinApis';

type TabId = 'viewer' | 'simulation' | 'layers' | 'datasets';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

interface LeftPanelTabsProps {
  onProteinSelect?: (selection: ProteinSelection) => void;
}

/**
 * Biolabs Left Panel with Tabs
 *
 * Tabbed interface for switching between:
 * - Protein Viewer
 * - Simulation Engine
 * - Layer System
 * - Datasets
 */
export default function LeftPanelTabs({ onProteinSelect }: LeftPanelTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('viewer');

  const tabs: Tab[] = [
    {
      id: 'viewer',
      label: 'Viewer',
      icon: <Microscope size={14} />,
      component: <ProteinViewer onProteinSelect={onProteinSelect} />,
    },
    {
      id: 'simulation',
      label: 'Simulation',
      icon: <Zap size={14} />,
      component: <SimulationEngine />,
    },
    {
      id: 'layers',
      label: 'Layers',
      icon: <Layers size={14} />,
      component: <LayerSystem />,
    },
    {
      id: 'datasets',
      label: 'Datasets',
      icon: <Database size={14} />,
      component: (
        <div className="flex flex-col h-full p-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Recent Datasets
          </div>
          <div className="flex-1 space-y-2">
            {['1A2B.pdb', '3C4D.cif', 'AF2_Model_v1'].map((dataset, idx) => (
              <div
                key={idx}
                className="p-2 bg-secondary border border-border text-xs cursor-pointer hover:bg-muted transition-colors"
              >
                {dataset}
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="flex border-b border-border bg-[#0F0F0F]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            title={tab.label}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </div>
  );
}
