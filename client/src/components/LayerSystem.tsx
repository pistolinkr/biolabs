import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, Lock, Unlock, Trash2, Plus } from 'lucide-react';

interface Layer {
  id: string;
  name: string;
  type: 'protein' | 'ligand' | 'membrane' | 'annotation' | 'simulation';
  visible: boolean;
  locked: boolean;
  opacity: number;
  color?: string;
  children?: Layer[];
}

/**
 * Biolabs Layer System
 * 
 * Photoshop-like layer management for molecular systems
 * - Hierarchical layer organization
 * - Visibility and lock toggles
 * - Opacity control
 * - Color assignment
 * - Layer effects and blending
 */
export default function LayerSystem() {
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: 'protein-group',
      name: 'Protein',
      type: 'protein',
      visible: true,
      locked: false,
      opacity: 1,
      color: '#7C8A99',
      children: [
        {
          id: 'chain-a',
          name: 'Chain A',
          type: 'protein',
          visible: true,
          locked: false,
          opacity: 1,
        },
        {
          id: 'chain-b',
          name: 'Chain B',
          type: 'protein',
          visible: true,
          locked: false,
          opacity: 1,
        },
      ],
    },
    {
      id: 'ligand',
      name: 'Ligand',
      type: 'ligand',
      visible: true,
      locked: false,
      opacity: 1,
      color: '#FF6B6B',
    },
    {
      id: 'membrane',
      name: 'Membrane',
      type: 'membrane',
      visible: false,
      locked: false,
      opacity: 0.5,
      color: '#4ECDC4',
    },
    {
      id: 'annotations',
      name: 'Annotations',
      type: 'annotation',
      visible: true,
      locked: false,
      opacity: 1,
    },
  ]);

  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(
    new Set(['protein-group'])
  );
  const [selectedLayer, setSelectedLayer] = useState<string | null>('chain-a');

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLayers(newExpanded);
  };

  const toggleVisibility = (id: string) => {
    const updateLayer = (layers: Layer[]): Layer[] => {
      return layers.map((layer) => {
        if (layer.id === id) {
          return { ...layer, visible: !layer.visible };
        }
        if (layer.children) {
          return { ...layer, children: updateLayer(layer.children) };
        }
        return layer;
      });
    };
    setLayers(updateLayer(layers));
  };

  const toggleLock = (id: string) => {
    const updateLayer = (layers: Layer[]): Layer[] => {
      return layers.map((layer) => {
        if (layer.id === id) {
          return { ...layer, locked: !layer.locked };
        }
        if (layer.children) {
          return { ...layer, children: updateLayer(layer.children) };
        }
        return layer;
      });
    };
    setLayers(updateLayer(layers));
  };

  const updateOpacity = (id: string, opacity: number) => {
    const updateLayer = (layers: Layer[]): Layer[] => {
      return layers.map((layer) => {
        if (layer.id === id) {
          return { ...layer, opacity };
        }
        if (layer.children) {
          return { ...layer, children: updateLayer(layer.children) };
        }
        return layer;
      });
    };
    setLayers(updateLayer(layers));
  };

  const renderLayerTree = (layerList: Layer[], depth = 0) => {
    return layerList.map((layer) => (
      <div key={layer.id}>
        <div
          onClick={() => setSelectedLayer(layer.id)}
          className={`flex items-center gap-1 px-2 py-1 text-xs cursor-pointer transition-colors ${
            selectedLayer === layer.id
              ? 'bg-accent text-background'
              : 'hover:bg-muted text-foreground'
          }`}
        >
          {layer.children && layer.children.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(layer.id);
              }}
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
            onClick={(e) => {
              e.stopPropagation();
              toggleVisibility(layer.id);
            }}
            className="p-0 hover:text-foreground transition-colors"
          >
            {layer.visible ? (
              <Eye size={12} />
            ) : (
              <EyeOff size={12} className="text-muted-foreground" />
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLock(layer.id);
            }}
            className="p-0 hover:text-foreground transition-colors"
          >
            {layer.locked ? (
              <Lock size={12} />
            ) : (
              <Unlock size={12} className="text-muted-foreground" />
            )}
          </button>

          {layer.color && (
            <div
              className="w-3 h-3 border border-border"
              style={{ backgroundColor: layer.color }}
            />
          )}

          <span className="flex-1 truncate">{layer.name}</span>
        </div>

        {layer.children &&
          expandedLayers.has(layer.id) &&
          renderLayerTree(layer.children, depth + 1)}
      </div>
    ));
  };

  const selectedLayerData = (() => {
    const findLayer = (layers: Layer[]): Layer | null => {
      for (const layer of layers) {
        if (layer.id === selectedLayer) return layer;
        if (layer.children) {
          const found = findLayer(layer.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findLayer(layers);
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Layer Tree */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Layers</span>
          <button className="p-0 hover:text-foreground">
            <Plus size={12} />
          </button>
        </div>
        <div className="flex-1 panel-content">{renderLayerTree(layers)}</div>
      </div>

      {/* Layer Properties */}
      {selectedLayerData && (
        <div className="border-t border-border p-3 space-y-2">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Layer Properties
          </div>

          <div className="space-y-1">
            <label className="sci-label">Opacity</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={selectedLayerData.opacity}
                onChange={(e) =>
                  updateOpacity(selectedLayer!, parseFloat(e.target.value))
                }
                className="flex-1 h-1 bg-secondary rounded-none cursor-pointer"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {(selectedLayerData.opacity * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex gap-1">
            <button className="btn-compact flex-1 text-xs">Isolate</button>
            <button className="btn-compact flex-1 text-xs flex items-center justify-center gap-1">
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
