import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface PanelHeaderProps {
  title: string;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  actions?: React.ReactNode;
}

/**
 * Biolabs Panel Header
 * 
 * Scientific, minimal header for workstation panels
 * - Uppercase section label with tight tracking
 * - Optional collapse toggle
 * - Action buttons on the right
 */
export default function PanelHeader({
  title,
  collapsible = false,
  isCollapsed = false,
  onToggleCollapse,
  actions,
}: PanelHeaderProps) {
  return (
    <div className="panel-header">
      <div className="flex items-center gap-2">
        {collapsible && (
          <button
            onClick={onToggleCollapse}
            className="p-0 hover:text-foreground transition-colors"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>
        )}
        <span>{title}</span>
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}
