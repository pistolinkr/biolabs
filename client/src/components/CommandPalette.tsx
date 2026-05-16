import React, { useState, useEffect, useRef } from 'react';
import { Search, Microscope, Zap, Download, Settings, Maximize2, Eye } from 'lucide-react';

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Biolabs Command Palette
 * 
 * Raycast-like command interface (Cmd+K)
 * - Fast command search and execution
 * - Monochrome, minimal design
 * - Categories for organization
 */
export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    {
      id: 'load-protein',
      title: 'Load Protein',
      description: 'Load protein structure from PDB',
      icon: <Microscope size={16} />,
      category: 'Viewer',
      action: () => console.log('Load protein'),
    },
    {
      id: 'run-simulation',
      title: 'Run Simulation',
      description: 'Start molecular dynamics simulation',
      icon: <Zap size={16} />,
      category: 'Simulation',
      action: () => console.log('Run simulation'),
    },
    {
      id: 'isolate-chain',
      title: 'Isolate Chain',
      description: 'Show only selected chain',
      icon: <Eye size={16} />,
      category: 'Viewer',
      action: () => console.log('Isolate chain'),
    },
    {
      id: 'focus-residue',
      title: 'Focus Residue',
      description: 'Center view on selected residue',
      icon: <Maximize2 size={16} />,
      category: 'Viewer',
      action: () => console.log('Focus residue'),
    },
    {
      id: 'export-image',
      title: 'Export Image',
      description: 'Save current viewport as PNG',
      icon: <Download size={16} />,
      category: 'Export',
      action: () => console.log('Export image'),
    },
    {
      id: 'export-structure',
      title: 'Export Structure',
      description: 'Export structure as PDB/CIF',
      icon: <Download size={16} />,
      category: 'Export',
      action: () => console.log('Export structure'),
    },
    {
      id: 'toggle-surface',
      title: 'Toggle Surface',
      description: 'Show/hide molecular surface',
      icon: <Eye size={16} />,
      category: 'Viewer',
      action: () => console.log('Toggle surface'),
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Open application settings',
      icon: <Settings size={16} />,
      category: 'System',
      action: () => console.log('Open settings'),
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? filteredCommands.length - 1 : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-card border border-border rounded-none shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="border-b border-border p-3 flex items-center gap-2">
          <Search size={16} className="text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-sm"
          />
          <span className="text-xs text-muted-foreground">ESC</span>
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No commands found
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredCommands.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2 flex items-start gap-3 transition-colors ${
                    idx === selectedIndex
                      ? 'bg-accent text-background'
                      : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <div className="mt-1">{cmd.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{cmd.title}</div>
                    <div className="text-xs opacity-75">{cmd.description}</div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {cmd.category}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground flex justify-between">
          <span>↑↓ Navigate • Enter Select</span>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>
  );
}
