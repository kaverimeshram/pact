'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Database,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Coins,
  Send,
  ExternalLink,
  Split,
  FileText,
} from 'lucide-react';
import { Counterparty, Decision } from '@/lib/types';
import { RiskBadge, StrategyBadge } from './Badge';

interface DecisionViewProps {
  counterparties: Counterparty[];
  sessionId: string;
  onFreshSession: () => void;
  prefillCandidate?: string;
}

export const DecisionView: React.FC<DecisionViewProps> = ({
  counterparties,
  sessionId,
  onFreshSession,
  prefillCandidate = 'ResearchAgent-A',
}) => {
  const [task, setTask] = useState('Market research & competitor landscape report on autonomous agent protocols');
  const [budget, setBudget] = useState(50);
  const [candidateName, setCandidateName] = useState(prefillCandidate);
  const [simulateNoMemory, setSimulateNoMemory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [baseLoading, setBaseLoading] = useState(false);
  const [baseResult, setBaseResult] = useState<any | null>(null);

  const handleEvaluate = async () => {
    setLoading(true);
    setBaseResult(null);
    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          budget: Number(budget),
          candidateName,
          simulateNoMemory,
          sessionId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDecision(data.decision);
      } else {
        alert(data.error || 'Failed to evaluate decision');
      }
    } catch (err) {
      console.error('Evaluation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBaseEscrow = async () => {
    if (!decision) return;
    setBaseLoading(true);
    try {
      const res = await fetch('/api/base/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitmentId: `comm-escrow-${Date.now().toString(36)}`,
          counterpartyName: decision.selectedCounterparty,
          budget: decision.budget,
          strategy: decision.paymentStrategy,
        }),
      });
      const data = await res.json();
      setBaseResult(data);
    } catch (err: any) {
      setBaseResult({
        success: false,
        message: err.message || 'Base RPC error',
      });
    } finally {
      setBaseLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Session Controller */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-zinc-800 bg-[#121215]">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Decision Engine</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Evaluates candidate agents against persistent Sibyl Memory to enforce risk-adjusted payment terms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono">
            <span className="text-zinc-500">SESSION: </span>
            <span className="text-zinc-200 font-semibold">{sessionId}</span>
          </div>
          <button
            onClick={onFreshSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Start Fresh Session
          </button>
        </div>
      </div>

      {/* Input Control Matrix */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-[#121215] space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 uppercase">Task Description</label>
            <input
              id="input-decision-task"
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-zinc-500 font-sans"
              placeholder="e.g. Market research report on AI agent protocols"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 uppercase">Budget ($ USD / ETH)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-zinc-500 font-mono text-sm">$</span>
              <input
                id="input-decision-budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80 items-center">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 uppercase">Candidate Counterparty</label>
            <div className="flex gap-2">
              <select
                id="select-candidate"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-zinc-500 font-mono"
              >
                <option value="ResearchAgent-A">ResearchAgent-A (Demo Late Delivery)</option>
                <option value="CodeAuditAgent-X">CodeAuditAgent-X (Demo On-Time / High Quality)</option>
                {counterparties
                  .filter((c) => c.name !== 'ResearchAgent-A' && c.name !== 'CodeAuditAgent-X')
                  .map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.reliabilityScore}/100)
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Simulate No Memory Toggle */}
          <div className="flex flex-col justify-end">
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Simulate No Memory / Cold Start</span>
                <span className="text-[11px] text-zinc-500 block">
                  Disables Sibyl recall to test how a blind agent decides
                </span>
              </div>
              <button
                id="toggle-simulate-no-memory"
                type="button"
                onClick={() => setSimulateNoMemory(!simulateNoMemory)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  simulateNoMemory ? 'bg-amber-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    simulateNoMemory ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            id="btn-run-decision"
            onClick={handleEvaluate}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm transition-all shadow active:scale-98 flex items-center justify-center gap-2"
          >
            <Cpu className="w-4 h-4" />
            {loading ? 'Recalling Sibyl Memory & Evaluating...' : 'Run Decision Engine'}
          </button>
        </div>
      </div>

      {/* Decision Output Section */}
      {decision && (
        <div className="space-y-6">
          {/* Prominent Causal Notice: DECISION CHANGED BECAUSE OF MEMORY */}
          <div
            className={`p-5 rounded-xl border ${
              decision.memorySimulatedOff
                ? 'bg-zinc-900/60 border-zinc-700 text-zinc-300'
                : decision.riskLevel === 'HIGH' || decision.riskLevel === 'CRITICAL'
                ? 'bg-orange-950/40 border-orange-700/80 text-orange-200'
                : 'bg-emerald-950/40 border-emerald-700/80 text-emerald-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {decision.memorySimulatedOff ? (
                <AlertOctagon className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
              ) : decision.riskLevel === 'HIGH' || decision.riskLevel === 'CRITICAL' ? (
                <ShieldAlert className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1">
                <span className="text-xs font-mono uppercase font-bold tracking-wider">
                  {decision.memorySimulatedOff
                    ? 'COLD START MODE (SIMULATE NO MEMORY)'
                    : 'DECISION CHANGED BECAUSE OF MEMORY'}
                </span>
                <p className="text-sm font-medium leading-relaxed">{decision.reasoning}</p>
              </div>
            </div>
          </div>

          {/* Three-Column Decision Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Col 1: Recalled Memory Evidence */}
            <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215] space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <Database className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white uppercase font-mono">1. Recalled Memory</h2>
              </div>

              {decision.memoryEvidence.hasHistory ? (
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1.5">
                    <span className="text-[10px] text-zinc-500 uppercase block">Candidate</span>
                    <span className="text-sm text-white font-bold">{decision.selectedCounterparty}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">Past Commitments</span>
                      <span className="text-white font-bold">{decision.memoryEvidence.commitmentsCount}</span>
                    </div>
                    <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">Recorded Outcomes</span>
                      <span className="text-white font-bold">{decision.memoryEvidence.outcomesCount}</span>
                    </div>
                  </div>

                  {decision.memoryEvidence.lastDelayHours !== undefined && (
                    <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Last Delivery Delay:</span>
                        <span className="text-orange-400 font-bold">+{decision.memoryEvidence.lastDelayHours}h late</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Last Quality Score:</span>
                        <span className="text-yellow-400 font-bold">{decision.memoryEvidence.lastQualityScore}/10</span>
                      </div>
                    </div>
                  )}

                  {decision.memoryEvidence.snippets && decision.memoryEvidence.snippets.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-zinc-500 uppercase block">Sibyl FTS5 Memory Hit:</span>
                      <div className="p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 leading-snug overflow-hidden">
                        {decision.memoryEvidence.snippets[0]}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-zinc-500 font-mono space-y-2">
                  <Database className="w-8 h-8 text-zinc-700 mx-auto" />
                  <p>NO REPUTATION HISTORY</p>
                  <p className="text-[11px] text-zinc-600">
                    {decision.memorySimulatedOff
                      ? 'Sibyl recall bypassed via simulate switch.'
                      : 'Zero prior commitments or outcomes in Sibyl Memory.'}
                  </p>
                </div>
              )}
            </div>

            {/* Col 2: Deterministic Reputation */}
            <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215] space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <Cpu className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white uppercase font-mono">2. Reputation Engine</h2>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Calculated Score</span>
                    <span className="text-2xl font-bold font-mono text-white">
                      {decision.reliabilityScore}
                      <span className="text-xs text-zinc-500 font-normal">/100</span>
                    </span>
                  </div>
                  <RiskBadge risk={decision.riskLevel} />
                </div>

                <div className="space-y-2 font-mono">
                  <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Baseline Score:</span>
                    <span className="text-zinc-300">50</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Delay Penalty:</span>
                    <span className="text-orange-400">
                      {decision.memoryEvidence.lastDelayHours
                        ? `-${decision.memoryEvidence.lastDelayHours * 0.5} pts (${decision.memoryEvidence.lastDelayHours}h × 0.5)`
                        : '0 pts'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Quality Adjustment:</span>
                    <span className="text-yellow-400">
                      {decision.memoryEvidence.lastQualityScore
                        ? `${(decision.memoryEvidence.lastQualityScore - 8) * 0.5} pts (${decision.memoryEvidence.lastQualityScore}/10 vs 8/10 base)`
                        : '0 pts'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold">
                    <span className="text-zinc-400">Final Deterministic Score:</span>
                    <span className="text-white">{decision.reliabilityScore}/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 3: Enforced Payment Strategy */}
            <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215] space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <Coins className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white uppercase font-mono">3. Payment Strategy</h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-mono">Enforced Terms:</span>
                  <StrategyBadge strategy={decision.paymentStrategy} />
                </div>

                {/* Milestone Breakdown */}
                <div className="space-y-2 pt-1 font-mono text-xs">
                  {decision.milestones.map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded bg-zinc-900 border border-zinc-800 space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300 font-semibold">
                          Milestone {idx + 1}: ${m.amount} ({m.percentage}%)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {m.percentage === 20 ? 'Upfront' : m.percentage === 40 ? 'Checkpoint' : 'Settlement'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">{m.condition}</p>
                    </div>
                  ))}
                </div>

                {/* Base Escrow Trigger Button */}
                <div className="pt-2">
                  <button
                    id="btn-base-escrow"
                    onClick={handleTriggerBaseEscrow}
                    disabled={baseLoading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs font-mono transition-colors shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {baseLoading ? 'Signing Escrow...' : 'Authorize Escrow on Base Sepolia'}
                  </button>

                  {baseResult && (
                    <div className="mt-2 p-2.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono space-y-1">
                      <div className="text-zinc-300 font-semibold">{baseResult.message}</div>
                      {baseResult.txHash && (
                        <a
                          href={baseResult.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline flex items-center gap-1 text-[10px]"
                        >
                          View BaseScan Transaction <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
