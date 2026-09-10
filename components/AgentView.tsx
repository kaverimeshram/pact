'use client';

import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Database,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  DollarSign,
  Clock,
  ExternalLink,
  Layers,
  ChevronRight,
  RefreshCw,
  Wallet,
  Coins,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { PactAgentDecision, CandidateEvaluation } from '@/lib/types';
import { RiskBadge, StrategyBadge } from './Badge';
import { createBaseSepoliaEscrowTx, TxStepState } from '@/lib/wallet';

interface AgentViewProps {
  sessionId: string;
  onFreshSession?: () => void;
}

export const AgentView: React.FC<AgentViewProps> = ({ sessionId, onFreshSession }) => {
  const [task, setTask] = useState('Produce a market research report');
  const [budget, setBudget] = useState<number>(60);
  const [deadlineHours, setDeadlineHours] = useState<number>(24);
  const [simulateNoMemory, setSimulateNoMemory] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [decision, setDecision] = useState<PactAgentDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Base Sepolia on-chain broadcast state
  const [txState, setTxState] = useState<TxStepState>('IDLE');
  const [txMessage, setTxMessage] = useState<string>('');
  const [txHash, setTxHash] = useState<string | null>(null);

  const presets = [
    {
      label: 'Market Report ($60, 24h)',
      task: 'Produce a market research report',
      budget: 60,
      deadlineHours: 24,
      desc: 'Standard task: PACT compares A ($40, High Risk) vs B ($55, Low Risk) and selects B for safety.',
    },
    {
      label: 'Budget Scan ($45, 12h)',
      task: 'Produce a quick competitor scan report',
      budget: 45,
      deadlineHours: 12,
      desc: 'Tight budget: B is over budget, so A is selected with 3-stage milestone escrow enforced.',
    },
    {
      label: 'Enterprise Study ($95, 48h)',
      task: 'Produce a comprehensive enterprise market due diligence dossier',
      budget: 95,
      deadlineHours: 48,
      desc: 'High budget: PACT selects top-tier Agent C (94/100 reputation, $85) for premium quality.',
    },
  ];

  const handleApplyPreset = (p: (typeof presets)[0]) => {
    setTask(p.task);
    setBudget(p.budget);
    setDeadlineHours(p.deadlineHours);
    setDecision(null);
    setError(null);
    setTxHash(null);
    setTxState('IDLE');
  };

  const handleRunAgent = async () => {
    setLoading(true);
    setError(null);
    setDecision(null);
    setTxHash(null);
    setTxState('IDLE');
    setCurrentStep(1);

    try {
      // Step progression simulation for rich UI feedback
      await new Promise((r) => setTimeout(r, 250));
      setCurrentStep(2); // Memory Lookup
      await new Promise((r) => setTimeout(r, 300));
      setCurrentStep(3); // Reputation & Scoring
      await new Promise((r) => setTimeout(r, 300));
      setCurrentStep(4); // Selection & Strategy
      await new Promise((r) => setTimeout(r, 250));
      setCurrentStep(5); // Payment Terms & Escrow Prep

      const res = await fetch('/api/pact/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          budget: Number(budget),
          deadlineHours: Number(deadlineHours),
          simulateNoMemory,
          sessionId,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Agent evaluation failed');
      }

      setDecision(data.decision);
      setCurrentStep(6); // Done
    } catch (err: any) {
      console.error('Agent workflow error:', err);
      setError(err.message || 'Error running PACT Agent');
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastEscrow = async () => {
    if (!decision) return;
    try {
      const res = await createBaseSepoliaEscrowTx({
        counterpartyName: decision.selectedCounterparty,
        milestones: decision.paymentTerms.milestones,
        commitmentId: decision.commitmentCreated?.id || `comm-${Date.now()}`,
        onStatusChange: (status, msg) => {
          setTxState(status);
          setTxMessage(msg);
        },
      });
      setTxHash(res.txHash);
    } catch (err: any) {
      console.error('Escrow broadcast error:', err);
      setTxState('ERROR');
      setTxMessage(err.message || 'Failed to broadcast escrow to Base Sepolia');
    }
  };

  const workflowSteps = [
    { num: 1, label: 'Task Request', desc: 'Parse task & constraints' },
    { num: 2, label: 'Memory Recall', desc: 'Query Sibyl FTS5 & entities' },
    { num: 3, label: 'Reputation', desc: 'Calculate mathematical scores' },
    { num: 4, label: 'Selection', desc: 'Compare candidates & tradeoff' },
    { num: 5, label: 'Payment Terms', desc: 'Structure risk-adjusted escrow' },
    { num: 6, label: 'Base Escrow', desc: 'Prepare on-chain action' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Header Banner */}
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/80 text-[11px] font-mono font-medium flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-blue-400" />
                PACT AGENT WORKFLOW
              </span>
              <span className="px-2.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[11px] font-mono font-medium flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                Sibyl Memory Powered
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Autonomous Counterparty & Escrow Agent
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
              Give PACT any task. PACT queries persistent history in Sibyl Memory, calculates
              deterministic reputations, compares candidate tradeoffs, selects the safest agent, and
              prepares Base Sepolia escrow terms.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onFreshSession && (
              <button
                onClick={onFreshSession}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium transition-all"
                title="Reset session ID to demonstrate fresh session recall"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                <span>Fresh Session</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preset Tasks Selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Quick Task Scenarios:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className={`text-left p-3.5 rounded-lg border transition-all ${
                task === p.task && budget === p.budget
                  ? 'bg-zinc-900 border-blue-500/80 shadow-md shadow-blue-950/30'
                  : 'bg-[#0c0c0e] border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">{p.label}</span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">${p.budget}</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Task Input Card */}
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-6 shadow-md space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Task Description */}
          <div className="lg:col-span-6 space-y-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" /> Task Description
            </label>
            <textarea
              rows={3}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Produce a comprehensive market research report by tomorrow..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-sans resize-none"
            />
          </div>

          {/* Budget */}
          <div className="lg:col-span-3 space-y-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Budget Allocation ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-sm">$</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <p className="text-[11px] text-zinc-500">Maximum price PACT is authorized to spend</p>
          </div>

          {/* Deadline */}
          <div className="lg:col-span-3 space-y-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Deadline (Hours)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={168}
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <p className="text-[11px] text-zinc-500">Expected turnaround time</p>
          </div>
        </div>

        {/* Memory Differential Toggle & Run Button */}
        <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label
              className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-300"
              title="When enabled, bypasses Sibyl Memory recall to demonstrate cold-start behavior"
            >
              <input
                type="checkbox"
                checked={simulateNoMemory}
                onChange={(e) => setSimulateNoMemory(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-blue-600 focus:ring-0 focus:ring-offset-0"
              />
              <span className="font-medium">Simulate No Memory (Cold Start Mode)</span>
            </label>
            {simulateNoMemory && (
              <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800 text-[10px] font-mono">
                AMNESIA SIMULATION ACTIVE
              </span>
            )}
          </div>

          <button
            id="btn-run-pact"
            disabled={loading || !task || budget <= 0}
            onClick={handleRunAgent}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white font-semibold text-sm shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Evaluating via Sibyl Memory...</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 text-white" />
                <span>Run PACT Agent</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progressive Workflow Pipeline Stepper */}
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-zinc-400" /> PACT Autonomous Pipeline Execution:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {workflowSteps.map((step) => {
            const isCompleted = currentStep > step.num || (currentStep === 6 && decision);
            const isCurrent = currentStep === step.num && loading;
            return (
              <div
                key={step.num}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  isCompleted
                    ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
                    : isCurrent
                    ? 'bg-blue-950/40 border-blue-600 text-blue-200 animate-pulse'
                    : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                    {step.num}
                  </span>
                  <span className="text-xs font-semibold">{step.label}</span>
                </div>
                <div className="text-[10px] text-zinc-500 truncate">{step.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Decision Results Section */}
      {decision && (
        <div className="space-y-6 animate-fadeIn">
          {/* 1. HERO PACT DECISION BANNER */}
          <div className="bg-gradient-to-br from-[#0e1626] to-[#0c0c0e] border border-blue-500/40 rounded-xl p-6 shadow-2xl relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700 text-[10px] font-mono font-semibold">
                    PACT DECISION COMPLETE
                  </span>
                  <span className="text-xs font-mono text-zinc-500">
                    Session: {decision.sessionId}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {decision.selectedCounterparty}
                  </h2>
                  <span className="text-lg font-mono font-bold text-emerald-400">
                    ${decision.price}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Reputation:</span>
                  <span className="text-sm font-mono font-bold text-blue-400">
                    {decision.reputation}/100
                  </span>
                </div>
                <RiskBadge risk={decision.riskLevel} />
                <StrategyBadge strategy={decision.paymentStrategy} />
              </div>
            </div>

            {/* Core Rationale Highlight */}
            <div className="mt-4 p-4 rounded-lg bg-blue-950/30 border border-blue-800/40 text-sm text-zinc-200 leading-relaxed">
              <span className="font-semibold text-blue-300">Decision Rationale: </span>
              {decision.reasoning}
            </div>
          </div>

          {/* 2. LOAD-BEARING "MEMORY USED" EVIDENCE CARD */}
          <div className="bg-[#0c0c0e] border border-emerald-900/40 rounded-xl p-6 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-zinc-100 tracking-tight">
                  MEMORY EVIDENCE USED (SIBYL PERSISTENT RECALL)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                {decision.memoryEvidence.hasHistory ? 'HISTORICAL RECORDS FOUND' : 'COLD START / NO PRIOR RECORD'}
              </span>
            </div>

            {decision.memoryEvidence.hasHistory ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                  <span className="text-xs text-zinc-500 font-mono">Historical Commitments</span>
                  <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                    {decision.memoryEvidence.commitmentsCount} Total
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-0.5">
                    ✓ {decision.memoryEvidence.successfulCount} Successful
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                  <span className="text-xs text-zinc-500 font-mono">Delivery Timeliness</span>
                  <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                    {decision.memoryEvidence.lateCount > 0 ? (
                      <span className="text-amber-400">{decision.memoryEvidence.lateCount} Late</span>
                    ) : (
                      <span className="text-emerald-400">100% On-Time</span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {decision.memoryEvidence.lastDelayHours !== undefined
                      ? `Last delay: ${decision.memoryEvidence.lastDelayHours}h`
                      : 'Zero delays recorded'}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                  <span className="text-xs text-zinc-500 font-mono">Average Quality Score</span>
                  <div className="text-xl font-bold font-mono text-blue-400 mt-1">
                    {decision.memoryEvidence.avgQuality}/10
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {decision.memoryEvidence.lastQualityScore
                      ? `Last score: ${decision.memoryEvidence.lastQualityScore}/10`
                      : 'Consistent high rating'}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                  <span className="text-xs text-zinc-500 font-mono">Sibyl Search Hits</span>
                  <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                    {decision.memoryEvidence.journalSnippets.length} Events
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                    Indexed in SQLite FTS5
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-400">
                {decision.memorySimulatedOff
                  ? 'Memory recall was simulated OFF. No historical commitments or outcomes were retrieved from Sibyl Memory.'
                  : 'Cold Start: This counterparty has zero historical commitments recorded in Sibyl Memory. Standard baseline reputation (50/100) applied.'}
              </div>
            )}

            {/* Snippets list */}
            {decision.memoryEvidence.journalSnippets && decision.memoryEvidence.journalSnippets.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800/80">
                <span className="text-xs font-mono text-zinc-400 block mb-2">
                  Sibyl Journal Audit Trail:
                </span>
                <div className="space-y-1.5">
                  {decision.memoryEvidence.journalSnippets.map((snippet, idx) => (
                    <div
                      key={idx}
                      className="text-xs font-mono text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800/60"
                    >
                      {snippet}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. CANDIDATE COMPARISON MATRIX */}
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-zinc-100 tracking-tight mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              CANDIDATE COMPARISON MATRIX
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {decision.candidatesEvaluated.map((c: CandidateEvaluation) => {
                const isSelected = c.name === decision.selectedCounterparty;
                return (
                  <div
                    key={c.name}
                    className={`p-4 rounded-xl border transition-all relative ${
                      isSelected
                        ? 'bg-blue-950/20 border-blue-500 shadow-md shadow-blue-950/30 ring-1 ring-blue-500/50'
                        : !c.withinBudget
                        ? 'bg-zinc-950/60 border-zinc-800 opacity-60'
                        : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                          {c.name}
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                          )}
                        </h4>
                        <span className="text-[11px] text-zinc-500 block truncate">
                          {c.capability}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-bold text-zinc-200">
                        ${c.price}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 my-2.5">
                      <div className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono">
                        Score: <strong className="text-zinc-200">{c.reliabilityScore}/100</strong>
                      </div>
                      <RiskBadge risk={c.riskLevel} />
                    </div>

                    <div className="text-[11px] space-y-1 text-zinc-400 pt-2 border-t border-zinc-800/80">
                      <div>
                        History: {c.commitmentsCount} commitments ({c.memorySummary.successful} ok, {c.memorySummary.late} late)
                      </div>
                      <div>
                        Avg Delay: {c.avgDelayHours}h · Quality: {c.avgQualityScore}/10
                      </div>
                    </div>

                    {/* Status & Rejection Reason */}
                    <div className="mt-3 pt-2 border-t border-zinc-800/80">
                      {isSelected ? (
                        <div className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> SELECTED (Best Safe Fit)
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-400">
                          <span className="font-mono text-red-400 font-semibold block mb-0.5">
                            {c.status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-zinc-500 leading-tight block">
                            {c.rejectionReason}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. "WHY PACT SELECTED THIS AGENT" SECTION */}
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-zinc-100 tracking-tight mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              WHY PACT SELECTED THIS AGENT (EXPLAINABLE TRADEOFF ANALYSIS)
            </h3>

            <div className="space-y-4 text-sm text-zinc-300">
              <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 font-medium">
                {decision.whySection.winnerRationale}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Key Comparison Factors:
                </span>
                <ul className="space-y-1.5">
                  {decision.whySection.comparisonPoints.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-zinc-400">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 5. PAYMENT STRATEGY & MILESTONES */}
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  PAYMENT TERMS & MILESTONE SCHEDULE
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {decision.paymentTerms.summary}
                </p>
              </div>
              <StrategyBadge strategy={decision.paymentStrategy} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {decision.paymentTerms.milestones.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-zinc-300">
                      Stage {idx + 1}: {m.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      ${m.amount} ({m.percentage}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{m.condition}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 6. PREPARED BASE SEPOLIA ESCROW ACTION */}
          <div className="bg-[#0c0c0e] border border-blue-900/40 rounded-xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <h3 className="text-base font-bold text-zinc-100 tracking-tight">
                    NEXT ACTION: BASE SEPOLIA ESCROW
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Escrow terms prepared for on-chain locking on Base Sepolia.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-blue-950 text-blue-400 border border-blue-800">
                Network: Base Sepolia (Chain 84532)
              </span>
            </div>

            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-3 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-400">
                <div>
                  <span className="text-zinc-600 block">Beneficiary:</span>
                  <span className="text-zinc-200 truncate block">
                    {decision.preparedEscrowAction.beneficiaryAddress}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-600 block">Total Escrow Amount:</span>
                  <span className="text-emerald-400 font-bold">
                    ${decision.preparedEscrowAction.totalAmount} ({decision.preparedEscrowAction.ethEquivalent})
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800 text-zinc-400 text-[11px] leading-relaxed">
                {decision.preparedEscrowAction.instructions}
              </div>
            </div>

            {/* Direct Broadcast Button */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zinc-500">
                {txState === 'SUCCESS' && txHash ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Escrow broadcasted on Base Sepolia!
                    <a
                      href={`https://sepolia.basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-400 inline-flex items-center gap-0.5 ml-1"
                    >
                      View BaseScan <ExternalLink className="w-3 h-3" />
                    </a>
                  </span>
                ) : txMessage ? (
                  <span className="text-zinc-400 font-mono">{txMessage}</span>
                ) : (
                  <span>Ready to broadcast to PACTEscrow smart contract.</span>
                )}
              </div>

              <button
                onClick={handleBroadcastEscrow}
                disabled={txState === 'AWAITING_APPROVAL' || txState === 'BROADCASTING' || txState === 'CONFIRMING'}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Wallet className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {txState === 'CONFIRMING'
                    ? 'Confirming on Base...'
                    : txState === 'SUCCESS'
                    ? 'Broadcasted'
                    : 'Execute Escrow on Base'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
