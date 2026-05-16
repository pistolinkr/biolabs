import React, { useState } from 'react';
import { Save, Download, Upload, Trash2, Copy } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  created: string;
  modified: string;
  description: string;
}

/**
 * Biolabs Workspace Manager
 * 
 * Save, restore, and manage workspace sessions
 * - Save current workspace state
 * - Load previous sessions
 * - Export/import workspaces
 * - Workspace metadata and versioning
 */
export default function WorkspaceManager() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    {
      id: '1',
      name: 'Protein A Analysis',
      created: '2026-05-10',
      modified: '2026-05-15',
      description: 'MD simulation with ligand docking',
    },
    {
      id: '2',
      name: 'Membrane Study',
      created: '2026-05-08',
      modified: '2026-05-12',
      description: 'Lipid bilayer interaction analysis',
    },
    {
      id: '3',
      name: 'Structure Validation',
      created: '2026-05-05',
      modified: '2026-05-05',
      description: 'AlphaFold model quality assessment',
    },
  ]);

  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>('1');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const handleSaveWorkspace = () => {
    if (newWorkspaceName.trim()) {
      const newWorkspace: Workspace = {
        id: Date.now().toString(),
        name: newWorkspaceName,
        created: new Date().toISOString().split('T')[0],
        modified: new Date().toISOString().split('T')[0],
        description: 'New workspace',
      };
      setWorkspaces([newWorkspace, ...workspaces]);
      setNewWorkspaceName('');
      setSelectedWorkspace(newWorkspace.id);
    }
  };

  const handleDeleteWorkspace = (id: string) => {
    setWorkspaces(workspaces.filter((ws) => ws.id !== id));
    if (selectedWorkspace === id) {
      setSelectedWorkspace(workspaces[0]?.id || null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* New Workspace */}
      <div className="border-b border-border p-3 space-y-2">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          New Workspace
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="Workspace name..."
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            className="flex-1 px-2 py-1 bg-secondary border border-border text-xs text-foreground placeholder-muted-foreground rounded-none focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleSaveWorkspace}
            className="btn-compact flex items-center gap-1"
          >
            <Save size={12} />
            Save
          </button>
        </div>
      </div>

      {/* Workspace List */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Saved Workspaces
        </div>
        <div className="flex-1 panel-content space-y-2">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              onClick={() => setSelectedWorkspace(ws.id)}
              className={`p-2 border rounded-none cursor-pointer transition-colors ${
                selectedWorkspace === ws.id
                  ? 'bg-accent text-background border-accent'
                  : 'bg-secondary border-border text-foreground hover:bg-muted'
              }`}
            >
              <div className="text-xs font-medium">{ws.name}</div>
              <div className="text-xs opacity-75 mt-1">{ws.description}</div>
              <div className="text-xs opacity-50 mt-1">
                Modified: {ws.modified}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-border p-3 space-y-2">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Actions
        </div>
        <div className="space-y-1">
          <button className="w-full btn-compact flex items-center justify-center gap-1">
            <Download size={12} />
            Export
          </button>
          <button className="w-full btn-compact flex items-center justify-center gap-1">
            <Upload size={12} />
            Import
          </button>
          {selectedWorkspace && (
            <button
              onClick={() => handleDeleteWorkspace(selectedWorkspace)}
              className="w-full btn-compact flex items-center justify-center gap-1 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
