import React, { useState } from 'react';
import { Search, Upload, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  type ProteinSearchHit,
  type ProteinSearchSource,
  type ProteinSelection,
  proteinHitToSelection,
  searchRcsb,
  searchUniProt,
} from '@/lib/proteinApis';

interface ProteinViewerProps {
  onProteinSelect?: (selection: ProteinSelection) => void;
}

/**
 * Biolabs Protein Viewer
 *
 * Interface for loading and managing protein structures
 * - PDB/CIF file upload
 * - UniProt / RCSB PDB search
 * - Structure visualization controls
 * - Chain and residue selection
 */
export default function ProteinViewer({ onProteinSelect }: ProteinViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<ProteinSearchSource>('rcsb');
  const [hits, setHits] = useState<ProteinSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'cartoon' | 'surface' | 'spheres'>('cartoon');
  const [colorScheme, setColorScheme] = useState<'chain' | 'residue' | 'spectrum'>('chain');

  const displayModes = [
    { id: 'cartoon', label: 'Cartoon' },
    { id: 'surface', label: 'Surface' },
    { id: 'spheres', label: 'Spheres' },
  ];

  const colorSchemes = [
    { id: 'chain', label: 'By Chain' },
    { id: 'residue', label: 'By Residue' },
    { id: 'spectrum', label: 'Spectrum' },
  ];

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setHits([]);

    try {
      const next =
        searchSource === 'uniprot' ? await searchUniProt(q) : await searchRcsb(q);
      setHits(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHit = (hit: ProteinSearchHit, preferredStructure?: "experimental" | "alphafold") => {
    onProteinSelect?.(
      proteinHitToSelection(hit, preferredStructure ? { preferredStructure } : undefined),
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="border-b border-border p-3 space-y-2">
        <div className="flex gap-1">
          {(
            [
              { id: 'rcsb' as const, label: 'RCSB' },
              { id: 'uniprot' as const, label: 'UniProt' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSearchSource(tab.id);
                setHits([]);
                setError(null);
              }}
              className={`flex-1 text-xs py-1 px-2 border rounded-none transition-colors ${
                searchSource === tab.id
                  ? 'bg-accent text-background border-accent'
                  : 'bg-secondary border-border text-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={runSearch} className="flex gap-1">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={searchSource === 'rcsb' ? 'PDB ID or keyword…' : 'UniProt accession or keyword…'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 pl-6 bg-secondary border border-border text-xs text-foreground placeholder-muted-foreground rounded-none focus:outline-none focus:border-accent"
            />
          </div>
          <button type="submit" className="btn-compact flex items-center gap-1" disabled={loading}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? '…' : 'Search'}
          </button>
        </form>

        {error ? (
          <div className="text-xs text-destructive border border-destructive/40 px-2 py-1 bg-destructive/10">
            {error}
          </div>
        ) : null}

        <div className="flex gap-1">
          <button type="button" className="btn-compact flex-1 flex items-center justify-center gap-1">
            <Upload size={12} />
            Upload
          </button>
        </div>
      </div>

      {/* Search results */}
      {hits.length > 0 ? (
        <div className="border-b border-border flex flex-col min-h-[120px] max-h-[200px]">
          <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Results ({hits.length})
          </div>
          <ScrollArea className="flex-1 min-h-0 px-2 pb-2">
            <ul className="space-y-1">
              {hits.map((hit) => (
                <li key={`${hit.source}-${hit.id}`}>
                  <div className="rounded-none border border-border bg-secondary">
                    <button
                      type="button"
                      onClick={() => handleSelectHit(hit)}
                      className="w-full px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                    >
                      <div className="truncate font-medium text-foreground">{hit.title}</div>
                      {hit.subtitle ? (
                        <div className="truncate text-[10px] text-muted-foreground">{hit.subtitle}</div>
                      ) : null}
                      {hit.pdbIds?.length ? (
                        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          PDB: {hit.pdbIds.join(', ')}
                        </div>
                      ) : null}
                    </button>
                    {hit.source === 'uniprot' && hit.pdbIds?.length ? (
                      <div className="flex gap-1 border-t border-border px-2 py-1">
                        <button
                          type="button"
                          className="flex-1 rounded-none border border-border bg-background py-0.5 text-[10px] text-foreground hover:bg-muted"
                          onClick={() => handleSelectHit(hit, 'experimental')}
                        >
                          PDB
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-none border border-border bg-background py-0.5 text-[10px] text-foreground hover:bg-muted"
                          onClick={() => handleSelectHit(hit, 'alphafold')}
                        >
                          AlphaFold
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      ) : null}

      {/* Display Controls */}
      <div className="border-b border-border p-3 space-y-2">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Display
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground mb-1">Mode</div>
          <div className="flex gap-1">
            {displayModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setDisplayMode(mode.id as typeof displayMode)}
                className={`flex-1 text-xs py-1 px-2 border rounded-none transition-colors ${
                  displayMode === mode.id
                    ? 'bg-accent text-background border-accent'
                    : 'bg-secondary border-border text-foreground hover:bg-muted'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground mb-1">Color</div>
          <div className="flex gap-1">
            {colorSchemes.map((scheme) => (
              <button
                key={scheme.id}
                type="button"
                onClick={() => setColorScheme(scheme.id as typeof colorScheme)}
                className={`flex-1 text-xs py-1 px-2 border rounded-none transition-colors ${
                  colorScheme === scheme.id
                    ? 'bg-accent text-background border-accent'
                    : 'bg-secondary border-border text-foreground hover:bg-muted'
                }`}
              >
                {scheme.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Structure Info */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Structure
        </div>
        <div className="flex-1 panel-content space-y-3 overflow-y-auto">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Chains</div>
            <div className="space-y-1">
              {['A', 'B'].map((chain) => (
                <div
                  key={chain}
                  className="flex items-center justify-between px-2 py-1 bg-secondary border border-border text-xs"
                >
                  <span>Chain {chain}</span>
                  <span className="text-muted-foreground">234 res</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Ligands</div>
            <div className="px-2 py-1 bg-secondary border border-border text-xs text-muted-foreground">
              None loaded
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Measurements</div>
            <button type="button" className="w-full btn-compact text-xs">
              Distance Tool
            </button>
            <button type="button" className="w-full btn-compact text-xs">
              Angle Tool
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
