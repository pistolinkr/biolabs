import React from 'react';
import { Microscope, Command, Settings, Save, Download } from 'lucide-react';

interface AppHeaderProps {
  onCommandPaletteOpen: () => void;
  onSettingsOpen: () => void;
}

/**
 * Biolabs Application Header
 * 
 * Top navigation bar with:
 * - Application branding
 * - Command palette trigger (Cmd+K)
 * - Quick action buttons
 * - Settings access
 */
export default function AppHeader({
  onCommandPaletteOpen,
  onSettingsOpen,
}: AppHeaderProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onCommandPaletteOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCommandPaletteOpen]);

  return (
    <header className="border-b border-border bg-card h-12 flex items-center justify-between px-4">
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border border-accent flex items-center justify-center">
          <Microscope size={14} className="text-accent" />
        </div>
        <span className="text-sm font-medium tracking-tight">BIOLABS</span>
      </div>

      {/* Center: Command Palette */}
      <button
        onClick={onCommandPaletteOpen}
        className="hidden md:flex items-center gap-2 px-3 py-1 bg-secondary border border-border rounded-none hover:bg-muted transition-colors text-xs text-muted-foreground"
      >
        <Command size={14} />
        <span>Command...</span>
        <span className="ml-2 text-xs opacity-50">⌘K</span>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          title="Save Workspace"
          className="p-2 hover:bg-secondary transition-colors rounded-none"
        >
          <Save size={14} />
        </button>
        <button
          title="Export"
          className="p-2 hover:bg-secondary transition-colors rounded-none"
        >
          <Download size={14} />
        </button>
        <div className="w-px h-6 bg-border" />
        <button
          onClick={onSettingsOpen}
          title="Settings"
          className="p-2 hover:bg-secondary transition-colors rounded-none"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
}
