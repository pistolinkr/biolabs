import { Search, RefreshCw, Upload } from "lucide-react";
import React, { startTransition, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type ProteinSearchHit,
  type ProteinSearchSource,
  type ProteinSelection,
  proteinHitToSelection,
  searchRcsb,
  searchUniProt,
} from "@/lib/proteinApis";
import { loadSourceSearchFromSession, saveSourceSearchToSession } from "@/lib/sourceSearchStorage";
import { acceptLanguageForSearch, normalizeProteinSearchQuery } from "@/lib/proteinSearchQuery";
import { useViewer } from "@/contexts/ViewerContext";
import { useLocale } from "@/contexts/LocaleContext";

const STRUCTURE_ACCEPT = ".pdb,.cif,.mmcif,.ent";

export default function ProteinSourcePanel() {
  const { t } = useTranslation("workbench");
  const { resolvedLocale } = useLocale();
  const { setProteinSelection } = useViewer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initial = loadSourceSearchFromSession();
  const [searchQuery, setSearchQuery] = useState(initial.searchQuery);
  const [searchSource, setSearchSource] = useState<ProteinSearchSource>(initial.searchSource);
  const [hits, setHits] = useState<ProteinSearchHit[]>(initial.hits);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initial.error);

  useEffect(() => {
    const t = window.setTimeout(() => {
      saveSourceSearchToSession({ searchQuery, searchSource, hits, error });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchQuery, searchSource, hits, error]);

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = normalizeProteinSearchQuery(searchQuery);
    if (!q) return;
    setLoading(true);
    setError(null);
    setHits([]);
    try {
      const next =
        searchSource === "uniprot"
          ? await searchUniProt(q, { acceptLanguage: acceptLanguageForSearch(resolvedLocale) })
          : await searchRcsb(q);
      startTransition(() => {
        setHits(next);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("source.searchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHit = (hit: ProteinSearchHit, preferred?: "experimental" | "alphafold") => {
    setProteinSelection(proteinHitToSelection(hit, preferred ? { preferredStructure: preferred } : undefined));
  };

  const handleLocalStructurePick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (
      !lower.endsWith(".pdb") &&
      !lower.endsWith(".cif") &&
      !lower.endsWith(".mmcif") &&
      !lower.endsWith(".ent")
    ) {
      setError(t("source.fileTypeError"));
      return;
    }
    setError(null);
    const structureObjectUrl = URL.createObjectURL(file);
    const sel: ProteinSelection = {
      source: "file",
      id: file.name.replace(/\.[^.]+$/, ""),
      label: file.name,
      fileName: file.name,
      structureObjectUrl,
    };
    setProteinSelection(sel);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-2 border-b border-border p-2">
        <div className="flex gap-1">
          {(
            [
              { id: "rcsb" as const, label: "RCSB" },
              { id: "uniprot" as const, label: "UniProt" },
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
              className={`flex-1 border px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${
                searchSource === tab.id
                  ? "border-foreground bg-secondary text-foreground"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <form onSubmit={runSearch} className="flex gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchSource === "rcsb" ? t("source.rcsbPlaceholder") : t("source.uniprotPlaceholder")}
              className="w-full border border-border bg-input py-1.5 pl-7 pr-2 font-mono text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-muted-foreground"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="border border-border bg-card px-2 font-mono text-[10px] uppercase text-foreground hover:border-muted-foreground disabled:opacity-50"
          >
            {loading ? <RefreshCw className="size-3 animate-spin" /> : t("source.run")}
          </button>
        </form>
        {error ? (
          <div className="border border-destructive/40 bg-destructive/10 px-2 py-1 font-mono text-[10px] text-destructive">
            {error}
          </div>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept={STRUCTURE_ACCEPT}
          className="hidden"
          aria-hidden
          onChange={(e) => {
            handleLocalStructurePick(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-1 border border-border bg-card py-1 font-mono text-[10px] uppercase text-muted-foreground hover:border-muted-foreground hover:text-foreground"
        >
          <Upload className="size-3" />
          {t("source.importFile")}
        </button>
      </div>
      {hits.length ? (
        <div className="min-h-0 flex-1 overflow-y-auto space-y-1 p-2">
          <div className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            {t("source.results", { count: hits.length })}
          </div>
          {hits.map((hit) => (
            <div key={`${hit.source}-${hit.id}`} className="border border-border bg-card">
              <button
                type="button"
                onClick={() => handleSelectHit(hit)}
                className="w-full px-2 py-1.5 text-left hover:bg-secondary"
              >
                <div className="truncate font-mono text-[10px] text-foreground">{hit.title}</div>
                {hit.subtitle ? (
                  <div className="truncate font-mono text-[9px] text-muted-foreground">{hit.subtitle}</div>
                ) : null}
              </button>
              {hit.source === "uniprot" && hit.pdbIds?.length ? (
                <div className="flex gap-1 border-t border-border px-2 py-1">
                  <button
                    type="button"
                    className="flex-1 border border-border py-0.5 font-mono text-[9px] uppercase text-secondary-foreground hover:border-muted-foreground"
                    onClick={() => handleSelectHit(hit, "experimental")}
                  >
                    PDB
                  </button>
                  <button
                    type="button"
                    className="flex-1 border border-border py-0.5 font-mono text-[9px] uppercase text-secondary-foreground hover:border-muted-foreground"
                    onClick={() => handleSelectHit(hit, "alphafold")}
                  >
                    AlphaFold
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
