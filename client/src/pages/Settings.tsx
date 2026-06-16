import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import WorkspaceManager from '@/components/WorkspaceManager';
import { HELIX_PATH } from '@/lib/routes';

/**
 * Biolabs Settings Page
 * 
 * Dedicated page for workspace management and configuration
 */
export default function Settings() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => setLocation(HELIX_PATH)}
            className="p-2 hover:bg-secondary transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-lg font-medium tracking-tight">Workspace Management</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            <div className="border border-border rounded-none">
              <WorkspaceManager />
            </div>
          </div>

          {/* Info Panel */}
          <div className="space-y-4">
            <div className="border border-border p-4 space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider">
                About Workspaces
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Workspaces store your simulation state, layer configuration, and viewport settings.
                Save multiple workspaces to compare different analyses or restore previous sessions.
              </p>
            </div>

            <div className="border border-border p-4 space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider">
                Quick Tips
              </h3>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>• Use Cmd+K to quickly save workspace</li>
                <li>• Export workspaces for sharing</li>
                <li>• Auto-save keeps backups</li>
                <li>• Import previous sessions anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
