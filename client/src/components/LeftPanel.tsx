import React, { useState } from 'react';
import { Play, Pause, RotateCcw, ChevronDown, ChevronRight, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import PanelHeader from './PanelHeader';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  children?: Layer[];
}

/**
 * Biolabs Left Panel
 * 
 * Contains simulation controls and layer hierarchy
 * - Simulation playback controls (play, pause, step, speed, reset)
 * - Protein hierarchy tree
 * - Layer system with visibility/lock toggles
 * - Dataset browser
 */
export default function LeftPanel() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['root']));

  const mockLayers: Layer[] = [
    {
      id: 'protein',
      name: 'Protein',
      visible: true,
      locked: false,
      children: [
        { id: 'chain-a', name: 'Chain A', visible: true, locked: false },
        { id: 'chain-b', name: 'Chain B', visible: true, locked: false },
      ],
    },
    {
      id: 'ligand',
      name: 'Ligand',
      visible: true,
      locked: false,
    },
    {
      id: 'membrane',
      name: 'Membrane',
      visible: false,
      locked: false,
    },
    {
      id: 'annotations',
      name: 'Annotations',
      visible: true,
      locked: false,
    },
  ];

  const toggleLayerExpanded = (id: string) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLayers(newExpanded);
  };

  const renderLayerTree = (layers: Layer[], depth = 0) => {
    return layers.map((layer) => (
      <div key={layer.id}>
        <div className="flex items-center gap-1 px-2 py-1 hover:bg-muted text-xs">
          {layer.children && layer.children.length > 0 ? (
            <button
              onClick={() => toggleLayerExpanded(layer.id)}
              className="p-0 hover:text-foreground"
            >
              {expandedLayers.has(layer.id) ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          <button
            className="p-0 hover:text-foreground transition-colors"
            title={layer.visible ? 'Hide' : 'Show'}
          >
            {layer.visible ? (
              <Eye size={12} />
            ) : (
              <EyeOff size={12} className="text-muted-foreground" />
            )}
          </button>

          <button
            className="p-0 hover:text-foreground transition-colors"
            title={layer.locked ? 'Unlock' : 'Lock'}
          >
            {layer.locked ? (
              <Lock size={12} />
            ) : (
              <Unlock size={12} className="text-muted-foreground" />
            )}
          </button>

          <span className="flex-1 truncate text-foreground">{layer.name}</span>
        </div>

        {layer.children &&
          expandedLayers.has(layer.id) &&
          renderLayerTree(layer.children, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Simulation Controls */}
      <div className="border-b border-border p-3">
        <PanelHeader title="Simulation" />
        <div className="mt-3 space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className="btn-compact flex-1 flex items-center justify-center gap-1"
            >
              {isSimulating ? (
                <>
                  <Pause size={12} />
                  Pause
                </>
              ) : (
                <>
                  <Play size={12} />
                  Play
                </>
              )}
            </button>
            <button className="btn-compact flex-1 flex items-center justify-center gap-1">
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          <div className="space-y-1">
            <label className="sci-label block">Speed</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={simulationSpeed}
                onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-secondary rounded-none cursor-pointer"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {simulationSpeed.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Layers */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <PanelHeader title="Layers" />
        <div className="panel-content">
          {renderLayerTree(mockLayers)}
        </div>
      </div>

      {/* Datasets */}
      <div className="border-t border-border p-3">
        <PanelHeader title="Datasets" />
        <div className="mt-2 text-xs text-muted-foreground">
          <div className="py-2 px-2 border border-border rounded-none text-center">
            Drag & drop PDB/CIF files
          </div>
        </div>
      </div>
    </div>
  );
}
