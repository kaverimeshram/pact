'use client';

import React, { useState } from 'react';
import {
  Users,
  Clock,
  Award,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Cpu,
  PlusCircle,
  FileCheck,
} from 'lucide-react';
import { Counterparty, Commitment, Outcome } from '@/lib/types';
import { RiskBadge } from './Badge';

interface CounterpartiesViewProps {
  counterparties: Counterparty[];
  commitments: Commitment[];
  outcomes: Outcome[];
  onOpenEvaluate: (name: string) => void;
  onOpenCreateCommitment: () => void;
  onOpenRecordOutcome: (commitment: Commitment) => void;
}

export const CounterpartiesView: React.FC<CounterpartiesViewProps> = ({
  counterparties,
  commitments,
  outcomes,
  onOpenEvaluate,
  onOpenCreateCommitment,
  onOpenRecordOutcome,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<Counterparty | null>(
    counterparties[0] || null
  );

  const activeCp =
    selectedAgent ||
    counterparties.find((c) => c.name === 'ResearchAgent-A') ||
    counterparties[0];

  const agentCommitments = activeCp
    ? commitments.filter(
        (c) => c.counterpartyName?.toLowerCase() === activeCp.name.toLowerCase()
      )
    : [];

  const agentOutcomes = activeCp
    ? outcomes.filter(
        (o) =>
          o.counterpartyName?.toLowerCase() === activeCp.name.toLowerCase() ||
          agentCommitments.some((c) => c.id === o.commitmentId)
      )
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-zinc-800 bg-[#121215]">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Counterparty Intelligence</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Historical commitment tracking and deterministic reputation profiles stored in Sibyl Memory.
          </p>
        </div>

        <button
          onClick={onOpenCreateCommitment}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-colors shadow-sm self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Create New Commitment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List of Counterparties */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono uppercase text-zinc-400 px-1">Registered Counterparties</h2>
          {counterparties.map((cp) => {
            const isSelected = activeCp?.id === cp.id;
            return (
              <div
                key={cp.id}
                onClick={() => setSelectedAgent(cp)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-zinc-800/90 border-zinc-600 shadow'
                    : 'bg-[#121215] border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-white">{cp.name}</span>
                  <RiskBadge risk={cp.riskLevel} />
                </div>
                <div className="text-xs text-zinc-400 mb-3">{cp.capability}</div>

                <div className="flex items-center justify-between text-xs font-mono border-t border-zinc-800/80 pt-2 text-zinc-400">
                  <div>
                    Score:{' '}
                    <span
                      className={`font-bold ${
                        cp.reliabilityScore < 45
                          ? 'text-orange-400'
                          : cp.reliabilityScore >= 70
                          ? 'text-emerald-400'
                          : 'text-zinc-200'
                      }`}
                    >
                      {cp.reliabilityScore}/100
                    </span>
                  </div>
                  <div>{cp.commitments} commitments</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Profile & Historical Timeline */}
        {activeCp && (
          <div className="lg:col-span-2 space-y-6">
            {/* Top Profile Card */}
            <div className="p-6 rounded-xl border border-zinc-800 bg-[#121215] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">{activeCp.name}</h2>
                    <RiskBadge risk={activeCp.riskLevel} />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{activeCp.capability}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id={`btn-profile-eval-${activeCp.name}`}
                    onClick={() => onOpenEvaluate(activeCp.name)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs font-mono transition-colors shadow-sm"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    Evaluate for Task
                  </button>
                </div>
              </div>

              {/* Stat Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase block">Reliability</span>
                  <span
                    className={`text-xl font-bold ${
                      activeCp.reliabilityScore < 45
                        ? 'text-orange-400'
                        : activeCp.reliabilityScore >= 70
                        ? 'text-emerald-400'
                        : 'text-zinc-200'
                    }`}
                  >
                    {activeCp.reliabilityScore}/100
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase block">Commitments</span>
                  <span className="text-xl font-bold text-white">{activeCp.commitments}</span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase block">Average Delay</span>
                  <span className={`text-xl font-bold ${activeCp.averageDelay > 0 ? 'text-orange-400' : 'text-zinc-300'}`}>
                    +{activeCp.averageDelay}h
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase block">Average Quality</span>
                  <span className="text-xl font-bold text-yellow-400">{activeCp.averageQuality}/10</span>
                </div>
              </div>
            </div>

            {/* Historical Commitment Lifecycle Timeline */}
            <div className="p-6 rounded-xl border border-zinc-800 bg-[#121215] space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase font-mono tracking-wider">
                Historical Memory Lifecycle Timeline
              </h3>

              {agentCommitments.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500 font-mono">
                  No commitment records found in Sibyl Memory for this agent.
                </div>
              ) : (
                <div className="space-y-4">
                  {agentCommitments.map((c) => {
                    const outcome = agentOutcomes.find((o) => o.commitmentId === c.id);
                    return (
                      <div
                        key={c.id}
                        className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-3 font-mono text-xs"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-zinc-200 font-bold text-sm block">{c.task}</span>
                            <span className="text-zinc-500 text-[11px]">
                              Commitment ID: {c.id} · Budget: ${c.budget} · Expected: {c.expectedDeadlineHours}h
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-blue-950 text-blue-400 border border-blue-800'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>

                        {/* Step-by-Step Flow */}
                        <div className="pt-2 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                            <span className="text-zinc-500 block text-[9px] uppercase">1. Promised</span>
                            <span className="text-zinc-300">{c.expectedDeadlineHours}h deadline · 8/10 quality</span>
                          </div>
                          <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                            <span className="text-zinc-500 block text-[9px] uppercase">2. Actual Delivery</span>
                            <span className={outcome && outcome.delayHours > 0 ? 'text-orange-400' : 'text-zinc-300'}>
                              {outcome ? `${outcome.actualDeliveryHours}h (${outcome.delayHours}h late)` : 'In Progress'}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                            <span className="text-zinc-500 block text-[9px] uppercase">3. Assessed Quality</span>
                            <span className="text-yellow-400 font-bold">
                              {outcome ? `${outcome.qualityScore}/10` : 'Pending'}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                            <span className="text-zinc-500 block text-[9px] uppercase">4. Impact</span>
                            <span className="text-orange-300">
                              Reliability: 50 → {activeCp.reliabilityScore}
                            </span>
                          </div>
                        </div>

                        {c.status === 'ACTIVE' && (
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => onOpenRecordOutcome(c)}
                              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-sans font-medium"
                            >
                              Record Outcome
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
