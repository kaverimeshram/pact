'use client';

import React from 'react';
import {
  Users,
  FileCheck,
  Activity,
  Database,
  ArrowRight,
  PlusCircle,
  Cpu,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Counterparty, Commitment, SibylJournalEvent } from '@/lib/types';
import { RiskBadge, StatusBadge } from './Badge';

interface DashboardViewProps {
  counterparties: Counterparty[];
  commitments: Commitment[];
  journalEvents: SibylJournalEvent[];
  onNavigate: (tab: string) => void;
  onOpenCreateCommitment: () => void;
  onOpenEvaluate: (counterpartyName?: string) => void;
  onSeedDemo: () => void;
  loading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  counterparties,
  commitments,
  journalEvents,
  onNavigate,
  onOpenCreateCommitment,
  onOpenEvaluate,
  onSeedDemo,
  loading,
}) => {
  const avgReliability =
    counterparties.length > 0
      ? Math.round(
          counterparties.reduce((acc, c) => acc + c.reliabilityScore, 0) /
            counterparties.length
        )
      : 50;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="rounded-xl border border-zinc-800 bg-[#101014] p-6 sm:p-8 relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Sibyl Labs Hackathon 2026
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Persistent reputation for agents that remember who kept their promises.
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            PACT gives AI agents persistent memory of counterparty commitments and outcomes, so past behavior changes future economic decisions. Without Sibyl Memory, fresh sessions repeat blind counterparty mistakes.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              id="btn-hero-evaluate"
              onClick={() => onOpenEvaluate()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition-all shadow-sm active:scale-95"
            >
              <Cpu className="w-4 h-4" />
              Evaluate Counterparty
              <ArrowRight className="w-4 h-4 text-zinc-600" />
            </button>
            <button
              id="btn-hero-commitment"
              onClick={onOpenCreateCommitment}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium text-sm transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-zinc-400" />
              Create Commitment
            </button>
            <button
              id="btn-hero-seed"
              onClick={onSeedDemo}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 font-medium text-xs font-mono transition-all ml-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Hackathon Demo Data
            </button>
          </div>
        </div>

        {/* Causal Architecture Diagram Banner */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">Step 1 · Session A</span>
            <span className="text-zinc-200 font-medium">Outcome Recorded</span>
            <p className="text-[11px] text-zinc-400 mt-0.5">38h delivery vs 24h promise (14h delay, 6/10 quality)</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/80">
            <span className="text-[10px] text-blue-400 uppercase font-mono font-bold block mb-1">Step 2 · Sibyl Storage</span>
            <span className="text-zinc-200 font-medium">Persistent Memory</span>
            <p className="text-[11px] text-zinc-400 mt-0.5">Entities + COLD journal stored to ~/.sibyl-memory/memory.db</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/80">
            <span className="text-[10px] text-amber-400 uppercase font-mono font-bold block mb-1">Step 3 · Fresh Session B</span>
            <span className="text-zinc-200 font-medium">Cross-Session Recall</span>
            <p className="text-[11px] text-zinc-400 mt-0.5">Zero local conversational state; recalls history from Sibyl</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/80">
            <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold block mb-1">Step 4 · Decision Changed</span>
            <span className="text-zinc-200 font-medium">Deterministic Terms</span>
            <p className="text-[11px] text-zinc-400 mt-0.5">Score drops to 42 → 3 milestone escrow enforced on $50 task</p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215]">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Counterparties</span>
            <Users className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{counterparties.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Autonomous agents evaluated</div>
        </div>

        <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215]">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Commitments</span>
            <FileCheck className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{commitments.length}</div>
          <div className="text-xs text-zinc-500 mt-1">
            {commitments.filter((c) => c.status === 'COMPLETED').length} fulfilled / {commitments.length} total
          </div>
        </div>

        <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215]">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Average Reliability</span>
            <Activity className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {avgReliability}<span className="text-sm font-normal text-zinc-500">/100</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">Deterministic score aggregate</div>
        </div>

        <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215]">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Sibyl Journal Events</span>
            <Database className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{journalEvents.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Append-only COLD tier events</div>
        </div>
      </div>

      {/* Main Grid: Counterparties & Live Memory Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Counterparty Table (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-[#121215] overflow-hidden">
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Counterparty Directory</h2>
              <p className="text-xs text-zinc-400">Tracked agents with persistent historical reliability</p>
            </div>
            <button
              onClick={() => onNavigate('counterparties')}
              className="text-xs text-zinc-400 hover:text-zinc-200 font-mono flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Agent Name</th>
                  <th className="py-3 px-4">Reliability</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Commitments</th>
                  <th className="py-3 px-4">Avg Delay</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {counterparties.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No counterparties in memory yet. Click "Load Hackathon Demo Data" above.
                    </td>
                  </tr>
                ) : (
                  counterparties.map((cp) => (
                    <tr key={cp.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{cp.name}</div>
                        <div className="text-[11px] text-zinc-500 truncate max-w-[160px]">
                          {cp.capability}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        <span
                          className={
                            cp.reliabilityScore < 45
                              ? 'text-orange-400'
                              : cp.reliabilityScore >= 70
                              ? 'text-emerald-400'
                              : 'text-zinc-300'
                          }
                        >
                          {cp.reliabilityScore}/100
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <RiskBadge risk={cp.riskLevel} />
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {cp.commitments} ({cp.lateCommitments} late)
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {cp.averageDelay > 0 ? (
                          <span className="text-orange-400">+{cp.averageDelay}h</span>
                        ) : (
                          <span className="text-zinc-500">0h</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          id={`btn-eval-${cp.name}`}
                          onClick={() => onOpenEvaluate(cp.name)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium transition-colors"
                        >
                          Evaluate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sibyl Journal Feed (1 col) */}
        <div className="rounded-xl border border-zinc-800 bg-[#121215] flex flex-col">
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Sibyl Journal Stream</h2>
            </div>
            <button
              onClick={() => onNavigate('memory')}
              className="text-xs text-zinc-400 hover:text-zinc-200 font-mono flex items-center gap-1"
            >
              Audit <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[380px]">
            {journalEvents.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs">
                No Sibyl journal events recorded yet.
              </div>
            ) : (
              journalEvents.slice(0, 5).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/80 text-xs space-y-1.5 font-mono"
                >
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="text-emerald-400 font-semibold uppercase">
                      {ev.acted?.action || ev.evaluated?.action || 'JOURNAL_EVENT'}
                    </span>
                    <span>{ev.ts ? new Date(ev.ts).toLocaleTimeString() : 'Recent'}</span>
                  </div>
                  <div className="text-zinc-300 text-[11px] leading-snug">
                    {ev.evaluated?.counterparty || ev.evaluated?.candidate ? (
                      <span>Agent: <strong className="text-white">{ev.evaluated.counterparty || ev.evaluated.candidate}</strong> · </span>
                    ) : null}
                    {ev.evaluated?.delayHours !== undefined ? (
                      <span className="text-orange-400">Delay: {ev.evaluated.delayHours}h · Quality: {ev.evaluated.qualityScore}/10</span>
                    ) : null}
                    {ev.acted?.strategy ? (
                      <span className="text-blue-300">Strategy: {ev.acted.strategy}</span>
                    ) : null}
                  </div>
                  {ev.forward?.recommendation || ev.forward?.enforceTerms ? (
                    <div className="text-[10px] text-zinc-400 bg-zinc-950/60 p-1.5 rounded border border-zinc-800">
                      Forward note: {ev.forward?.recommendation || ev.forward?.enforceTerms}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
