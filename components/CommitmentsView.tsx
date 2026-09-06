'use client';

import React, { useState } from 'react';
import {
  FileCheck,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Coins,
  Send,
  Eye,
} from 'lucide-react';
import { Commitment, Outcome } from '@/lib/types';
import { StatusBadge, StrategyBadge } from './Badge';

interface CommitmentsViewProps {
  commitments: Commitment[];
  outcomes: Outcome[];
  onOpenCreateCommitment: () => void;
  onOpenRecordOutcome: (commitment: Commitment) => void;
}

export const CommitmentsView: React.FC<CommitmentsViewProps> = ({
  commitments,
  outcomes,
  onOpenCreateCommitment,
  onOpenRecordOutcome,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(null);

  const filteredCommitments = commitments.filter((c) => {
    if (filter === 'ACTIVE') return c.status === 'ACTIVE';
    if (filter === 'COMPLETED') return c.status === 'COMPLETED' || c.status === 'FAILED';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-zinc-800 bg-[#121215]">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Commitment Tracker</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Active and fulfilled commitments with deadlines, milestones, and Sibyl Memory outcome bindings.
          </p>
        </div>

        <button
          onClick={onOpenCreateCommitment}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-colors shadow-sm self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Create Commitment
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
              filter === f
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {f} ({f === 'ALL' ? commitments.length : commitments.filter((c) => (f === 'ACTIVE' ? c.status === 'ACTIVE' : c.status !== 'ACTIVE')).length})
          </button>
        ))}
      </div>

      {/* Commitments Table */}
      <div className="rounded-xl border border-zinc-800 bg-[#121215] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 uppercase text-[10px]">
              <tr>
                <th className="py-3.5 px-4 font-sans font-semibold">Counterparty</th>
                <th className="py-3.5 px-4 font-sans font-semibold">Task</th>
                <th className="py-3.5 px-4">Budget</th>
                <th className="py-3.5 px-4">Deadline</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Outcome</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredCommitments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500 font-sans">
                    No commitments found in Sibyl Memory for this filter.
                  </td>
                </tr>
              ) : (
                filteredCommitments.map((c) => {
                  const outcome = outcomes.find((o) => o.commitmentId === c.id);
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-900/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCommitment(c)}
                    >
                      <td className="py-3.5 px-4 font-medium text-white">
                        {c.counterpartyName}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300 font-sans max-w-[220px] truncate">
                        {c.task}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        ${c.budget}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        {c.expectedDeadlineHours}h
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        {outcome ? (
                          <span
                            className={
                              outcome.delayHours > 0
                                ? 'text-orange-400 font-semibold'
                                : 'text-emerald-400 font-semibold'
                            }
                          >
                            {outcome.delayHours > 0
                              ? `Late (${outcome.delayHours}h) / ${outcome.qualityScore}/10`
                              : `On-time / ${outcome.qualityScore}/10`}
                          </span>
                        ) : (
                          <span className="text-zinc-500">In-progress</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {c.status === 'ACTIVE' && (
                            <button
                              onClick={() => onOpenRecordOutcome(c)}
                              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs transition-colors"
                            >
                              Record Outcome
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedCommitment(c)}
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Commitment Outcome Drawer / Detail */}
      {selectedCommitment && (
        <div className="p-6 rounded-xl border border-zinc-700 bg-[#101014] space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white font-sans">
                Commitment Details: {selectedCommitment.id}
              </h3>
            </div>
            <button
              onClick={() => setSelectedCommitment(null)}
              className="text-xs text-zinc-500 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase block">Task Description</span>
              <span className="text-white font-sans font-medium text-sm block">
                {selectedCommitment.task}
              </span>
              <span className="text-zinc-400 text-[11px]">
                Counterparty: <strong>{selectedCommitment.counterpartyName}</strong>
              </span>
            </div>

            <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase block">Terms & Strategy</span>
              <span className="text-emerald-400 font-bold text-sm block">
                ${selectedCommitment.budget} USD
              </span>
              <span className="text-zinc-400 text-[11px]">
                Deadline: {selectedCommitment.expectedDeadlineHours}h · Quality Benchmark: {selectedCommitment.expectedQuality}/10
              </span>
            </div>

            <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase block">Sibyl Memory Outcome</span>
              {(() => {
                const outcome = outcomes.find((o) => o.commitmentId === selectedCommitment.id);
                if (!outcome) {
                  return <span className="text-zinc-500 text-xs block">Awaiting deliverable submission</span>;
                }
                return (
                  <div>
                    <span className={outcome.delayHours > 0 ? 'text-orange-400 font-bold block' : 'text-emerald-400 font-bold block'}>
                      {outcome.actualDeliveryHours}h delivery ({outcome.delayHours}h late) · {outcome.qualityScore}/10
                    </span>
                    <span className="text-zinc-400 text-[11px] block mt-0.5">
                      Notes: {outcome.notes}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
