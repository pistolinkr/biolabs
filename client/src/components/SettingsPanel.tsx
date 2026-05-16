import React, { useState } from 'react';
import { X } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Biolabs Settings Panel
 * 
 * Application configuration and preferences
 * - Display settings
 * - Performance options
 * - Simulation parameters
 * - UI preferences
 */
export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState({
    hudVisible: true,
    hudPosition: 'top-right' as const,
    antialiasing: true,
    shadowsEnabled: true,
    fpsLimit: 60,
    autoSave: true,
    autoSaveInterval: 5,
    theme: 'dark' as const,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }));
  };

  const handleChange = (key: keyof typeof settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] bg-card border border-border rounded-none flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto panel-content space-y-6">
          {/* Display Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Display
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs">Scientific HUD</label>
                <button
                  onClick={() => handleToggle('hudVisible')}
                  className={`w-10 h-5 border rounded-none transition-colors ${
                    settings.hudVisible
                      ? 'bg-accent border-accent'
                      : 'bg-secondary border-border'
                  }`}
                />
              </div>
              {settings.hudVisible && (
                <div className="pl-4">
                  <label className="text-xs text-muted-foreground block mb-1">
                    HUD Position
                  </label>
                  <select
                    value={settings.hudPosition}
                    onChange={(e) =>
                      handleChange('hudPosition', e.target.value)
                    }
                    className="w-full px-2 py-1 bg-secondary border border-border text-xs text-foreground rounded-none focus:outline-none focus:border-accent"
                  >
                    <option>top-left</option>
                    <option>top-right</option>
                    <option>bottom-left</option>
                    <option>bottom-right</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Performance */}
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Performance
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs">Antialiasing</label>
                <button
                  onClick={() => handleToggle('antialiasing')}
                  className={`w-10 h-5 border rounded-none transition-colors ${
                    settings.antialiasing
                      ? 'bg-accent border-accent'
                      : 'bg-secondary border-border'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs">Shadows</label>
                <button
                  onClick={() => handleToggle('shadowsEnabled')}
                  className={`w-10 h-5 border rounded-none transition-colors ${
                    settings.shadowsEnabled
                      ? 'bg-accent border-accent'
                      : 'bg-secondary border-border'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground block">
                  FPS Limit: {settings.fpsLimit}
                </label>
                <input
                  type="range"
                  min="30"
                  max="144"
                  step="1"
                  value={settings.fpsLimit}
                  onChange={(e) =>
                    handleChange('fpsLimit', parseInt(e.target.value))
                  }
                  className="w-full h-1 bg-secondary rounded-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Workspace */}
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Workspace
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs">Auto-save</label>
                <button
                  onClick={() => handleToggle('autoSave')}
                  className={`w-10 h-5 border rounded-none transition-colors ${
                    settings.autoSave
                      ? 'bg-accent border-accent'
                      : 'bg-secondary border-border'
                  }`}
                />
              </div>
              {settings.autoSave && (
                <div className="pl-4">
                  <label className="text-xs text-muted-foreground block mb-1">
                    Auto-save Interval (minutes): {settings.autoSaveInterval}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={settings.autoSaveInterval}
                    onChange={(e) =>
                      handleChange('autoSaveInterval', parseInt(e.target.value))
                    }
                    className="w-full h-1 bg-secondary rounded-none cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* About */}
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              About
            </h3>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Biolabs v1.0</div>
              <div>Next-Generation Bio Simulation Platform</div>
              <div className="pt-2">© 2026 Biolabs Project</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="btn-compact"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
