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
            Active and fulfilled commitments with milestones and real-time Sibyl Memory outcome bindings.
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

      {/* Commitments List */}
      <div className="space-y-4">
        {filteredCommitments.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-zinc-800 bg-[#121215] text-xs text-zinc-500 font-mono">
            No commitments match this filter.
          </div>
        ) : (
          filteredCommitments.map((c) => {
            const outcome = outcomes.find((o) => o.commitmentId === c.id);
            return (
              <div
                key={c.id}
                className="p-5 rounded-xl border border-zinc-800 bg-[#121215] space-y-4 font-mono text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-sans">{c.task}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      ID: <span className="text-zinc-300">{c.id}</span> · Agent:{' '}
                      <span className="text-zinc-200 font-semibold">{c.counterpartyName}</span> · Budget:{' '}
                      <span className="text-emerald-400 font-bold">${c.budget}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {c.paymentStrategy && <StrategyBadge strategy={c.paymentStrategy} />}
                    {c.status === 'ACTIVE' && (
                      <button
                        onClick={() => onOpenRecordOutcome(c)}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-medium transition-colors"
                      >
                        Record Outcome
                      </button>
                    )}
                  </div>
                </div>

                {/* Terms and Outcome Detail */}
                <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <span className="text-zinc-500 uppercase text-[9px] block">Expected Timeline</span>
                    <span className="text-zinc-300">{c.expectedDeadlineHours}h deadline</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase text-[9px] block">Expected Quality</span>
                    <span className="text-zinc-300">{c.expectedQuality}/10 minimum benchmark</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase text-[9px] block">Recorded Outcome</span>
                    {outcome ? (
                      <span className={outcome.delayHours > 0 ? 'text-orange-400 font-bold' : 'text-emerald-400'}>
                        Delivered in {outcome.actualDeliveryHours}h ({outcome.delayHours}h late) · {outcome.qualityScore}/10
                      </span>
                    ) : (
                      <span className="text-zinc-500">Awaiting deliverable submission</span>
                    )}
                  </div>
                </div>

                {/* Base Transaction Hash if logged */}
                {c.txHash && (
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1">
                    <span>Base Sepolia Escrow TX:</span>
                    <a
                      href={`https://sepolia.basescan.org/tx/${c.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {c.txHash.slice(0, 10)}...{c.txHash.slice(-8)} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
