'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  CheckCircle2,
  FileCode,
  Layers,
  ArrowRight,
  Terminal,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { SibylEntity, SibylJournalEvent, SibylSearchResult } from '@/lib/types';

interface MemoryViewProps {
  sibylStatus: { status: string; db_path: string; exists: boolean; schema_version: number } | null;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ sibylStatus }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'counterparties' | 'commitments' | 'outcomes'>('all');
  const [entities, setEntities] = useState<SibylEntity[]>([]);
  const [journalEvents, setJournalEvents] = useState<SibylJournalEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('ResearchAgent-A');
  const [searchHits, setSearchHits] = useState<SibylSearchResult[]>([]);
  const [searchVerdict, setSearchVerdict] = useState<string>('ok');
  const [loading, setLoading] = useState(false);

  const fetchMemoryData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memory');
      const data = await res.json();
      if (data.success) {
        setEntities(data.entities || []);
        setJournalEvents(data.journalEvents || []);
      }
    } catch (err) {
      console.error('Failed to fetch memory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchHits(data.hits || []);
        setSearchVerdict(data.verdict || 'ok');
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemoryData();
    handleSearch();
  }, []);

  const filteredEntities = entities.filter((e) => {
    if (activeCategory === 'all') return true;
    return e.category === activeCategory;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-zinc-800 bg-[#121215]">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Sibyl Memory Inspector</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Direct audit log of persistent entities, COLD-tier journal events, and FTS5 search index.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono">
            <span className="text-zinc-500">DB: </span>
            <span className="text-emerald-400 font-semibold">~/.sibyl-memory/memory.db</span>
          </div>
          <button
            onClick={fetchMemoryData}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Refresh memory store"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Memory Flow Architecture Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215] space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-400 uppercase">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            1. PERSISTED
          </div>
          <h3 className="text-sm font-semibold text-white">Commitments & Outcomes</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Written by Session A to Sibyl's SQLite store: promised deadlines, actual delivery delays, quality scores, and verification notes.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215] space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            2. RECALLED
          </div>
          <h3 className="text-sm font-semibold text-white">Cross-Session Retrieval</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Queried by Fresh Session B via FTS5 multi-tier search without relying on local JavaScript state or conversation cache.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215] space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            3. USED FOR
          </div>
          <h3 className="text-sm font-semibold text-white">Reputation & Decisions</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Feeds the deterministic reputation engine to downgrade high-risk agents and enforce 3-stage milestone escrow disbursements.
          </p>
        </div>
      </div>

      {/* Sibyl FTS5 Live Search Explorer */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-[#121215] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white uppercase font-mono">Sibyl FTS5 Full-Text Search</h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Verdict: <span className="text-emerald-400 font-bold">{searchVerdict}</span> · {searchHits.length} matches
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-2.5" />
            <input
              id="input-sibyl-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities, journal events, delay hours, quality scores..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-mono text-xs font-bold transition-colors"
          >
            Query Store
          </button>
        </form>

        {/* Search Results */}
        <div className="space-y-2 pt-2">
          {searchHits.length === 0 ? (
            <div className="text-center py-6 text-xs text-zinc-500 font-mono">
              No matching memory rows found for "{searchQuery}".
            </div>
          ) : (
            searchHits.map((h, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 font-mono text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="text-blue-400 uppercase">
                    Tier: {h.tier} {h.category ? `(${h.category})` : ''} · Key: {h.key}
                  </span>
                  <span>Rank: {h.rank}</span>
                </div>
                <div className="text-zinc-300 text-[11px]">{h.snippet}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Raw Entities & Journal Tabs */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-[#121215] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white uppercase font-mono">
              Persisted Entities ({filteredEntities.length})
            </h2>
          </div>

          <div className="flex gap-1">
            {(['all', 'counterparties', 'commitments', 'outcomes'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono capitalize transition-colors ${
                  activeCategory === cat
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Entities List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto font-mono text-xs">
          {filteredEntities.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">No entities stored in this category.</div>
          ) : (
            filteredEntities.map((ent) => (
              <div key={ent.id} className="p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-300 font-bold">
                    [{ent.category.toUpperCase()}] {ent.name}
                  </span>
                  <span className="text-zinc-500 text-[10px]">Updated: {new Date(ent.updated_at).toLocaleString()}</span>
                </div>
                <pre className="p-2.5 rounded bg-zinc-950 border border-zinc-800/80 text-[10px] text-zinc-300 overflow-x-auto">
                  {JSON.stringify(ent.body, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
