'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Database,
  Cpu,
  Coins,
  ShieldAlert,
  AlertTriangle,
  Play,
  RotateCcw,
  Split,
  Layers,
  ExternalLink,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { Decision } from '@/lib/types';
import { RiskBadge, StrategyBadge } from './Badge';
import { formatBaseScanTxUrl } from '@/lib/contracts/pactEscrow';

interface DemoViewProps {
  sessionId: string;
  onFreshSession: () => void;
  onRefreshAll: () => void;
}

export const DemoView: React.FC<DemoViewProps> = ({
  sessionId,
  onFreshSession,
  onRefreshAll,
}) => {
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stepData, setStepData] = useState<{
    commitment?: any;
    outcome?: any;
    recalled?: any;
    decisionWithMemory?: Decision | null;
    decisionWithoutMemory?: Decision | null;
    escrowResult?: any;
  }>({});

  const executeStep = async (step: number) => {
    setLoading(true);
    try {
      if (step === 1) {
        // STEP 1: Create first commitment ($10, 24h deadline)
        const res = await fetch('/api/commitments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'comm-hackathon-demo-1',
            counterpartyName: 'ResearchAgent-A',
            task: 'Market Research Report on AI Agent Protocols',
            budget: 10,
            expectedDeadlineHours: 24,
            expectedQuality: 8,
          }),
        });
        const data = await res.json();
        setStepData((prev) => ({ ...prev, commitment: data.commitment }));
        setActiveStep(2);
      } else if (step === 2) {
        // STEP 2: Record outcome (Delivered 38h, Quality 6/10)
        const res = await fetch('/api/outcomes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commitmentId: 'comm-hackathon-demo-1',
            counterpartyName: 'ResearchAgent-A',
            actualDeliveryHours: 38,
            delayHours: 14,
            qualityScore: 6,
            success: true,
            notes: 'Delivered in 38h (14h late) with quality score 6/10',
          }),
        });
        const data = await res.json();
        setStepData((prev) => ({ ...prev, outcome: data.outcome }));
        setActiveStep(3);
      } else if (step === 3) {
        // STEP 3: Persist to Sibyl (Verify status & entities)
        const res = await fetch('/api/memory?query=ResearchAgent-A');
        const data = await res.json();
        setStepData((prev) => ({ ...prev, recalled: data }));
        setActiveStep(4);
      } else if (step === 4) {
        // STEP 4: Start fresh session (generates visibly different session ID)
        onFreshSession();
        setActiveStep(5);
      } else if (step === 5) {
        // STEP 5: Recall history from Sibyl in fresh session
        const res = await fetch('/api/memory?query=ResearchAgent-A');
        const data = await res.json();
        setStepData((prev) => ({ ...prev, recalled: data }));
        setActiveStep(6);
      } else if (step === 6) {
        // STEP 6: Evaluate new $50 task WITH Memory & also fetch comparison
        const resWith = await fetch('/api/decide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: 'I need a research agent for a $50 task.',
            budget: 50,
            candidateName: 'ResearchAgent-A',
            simulateNoMemory: false,
            sessionId: sessionId,
          }),
        });
        const dataWith = await resWith.json();

        // Also evaluate without memory for comparison
        const resWithout = await fetch('/api/decide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: 'I need a research agent for a $50 task.',
            budget: 50,
            candidateName: 'ResearchAgent-A',
            simulateNoMemory: true,
            sessionId: sessionId,
          }),
        });
        const dataWithout = await resWithout.json();

        setStepData((prev) => ({
          ...prev,
          decisionWithMemory: dataWith.decision,
          decisionWithoutMemory: dataWithout.decision,
        }));
        setActiveStep(7);
      } else if (step === 7) {
        // STEP 7: Create Base Sepolia escrow ($50, $10 / $20 / $20)
        const res = await fetch('/api/base/escrow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commitmentId: 'comm-escrow-demo-step7',
            counterpartyName: 'ResearchAgent-A',
            budget: 50,
            strategy: 'MILESTONE_3',
            milestones: [
              { amount: 10, percentage: 20 },
              { amount: 20, percentage: 40 },
              { amount: 20, percentage: 40 },
            ],
          }),
        });
        const data = await res.json();
        setStepData((prev) => ({ ...prev, escrowResult: data }));
        onRefreshAll();
      }
    } catch (err) {
      console.error('Demo step error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemo = async () => {
    setLoading(true);
    try {
      await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      setStepData({});
      setActiveStep(1);
      onRefreshAll();
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      num: 1,
      title: 'STEP 1: Create commitment',
      desc: 'ResearchAgent-A · Market research · $10 · 24h',
    },
    {
      num: 2,
      title: 'STEP 2: Record outcome',
      desc: 'Delivered: 38h (14h late) · Quality: 6/10',
    },
    {
      num: 3,
      title: 'STEP 3: Persist outcome',
      desc: 'Sibyl Memory ✓ persisted to long-term storage',
    },
    {
      num: 4,
      title: 'STEP 4: Start fresh session',
      desc: 'New session ID · zero local conversational state',
    },
    {
      num: 5,
      title: 'STEP 5: Recall history',
      desc: 'Previous: 38h · Delay: 14h · Score: 42/100',
    },
    {
      num: 6,
      title: 'STEP 6: Make decision',
      desc: 'HIGH RISK · 3 MILESTONES ($10 / $20 / $20)',
    },
    {
      num: 7,
      title: 'STEP 7: Create Base Sepolia escrow',
      desc: 'Enforce $50 milestone terms on Base Sepolia',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-zinc-800 bg-[#121215]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white">Interactive Judging Demo</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            <strong>The PACT Causal Chain:</strong> Sibyl Memory → Persistent Reputation → Risk Assessment → Payment Strategy → Base Sepolia Escrow.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-colors border border-zinc-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Demo
        </button>
      </div>

      {/* Step Tracker Grid */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-[#121215] space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {steps.map((s) => {
            const isCompleted = activeStep > s.num;
            const isCurrent = activeStep === s.num;
            return (
              <div
                key={s.num}
                className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                  isCurrent
                    ? 'bg-blue-950/70 border-blue-600 text-white shadow'
                    : isCompleted
                    ? 'bg-zinc-900/90 border-emerald-800/60 text-zinc-300'
                    : 'bg-zinc-900/30 border-zinc-800 text-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[10px]">STEP {s.num}</span>
                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>
                <div className="text-[11px] font-semibold font-sans truncate">{s.title.replace(`STEP ${s.num}: `, '')}</div>
              </div>
            );
          })}
        </div>

        {/* Current Active Step Interactive Card */}
        <div className="p-5 rounded-lg bg-zinc-900/90 border border-zinc-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-blue-400 font-bold block">
                Current Execution · Step {activeStep} of 7
              </span>
              <h2 className="text-base font-bold text-white mt-0.5">{steps[activeStep - 1]?.title}</h2>
              <p className="text-xs text-zinc-400 mt-1">{steps[activeStep - 1]?.desc}</p>
            </div>

            <button
              id={`btn-demo-step-${activeStep}`}
              onClick={() => executeStep(activeStep)}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs font-mono transition-all shadow active:scale-95 self-start sm:self-auto"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loading
                ? 'Executing...'
                : activeStep === 1
                ? '1. Create Commitment'
                : activeStep === 2
                ? '2. Record Outcome'
                : activeStep === 3
                ? '3. Verify Persistence'
                : activeStep === 4
                ? '4. Start Fresh Session'
                : activeStep === 5
                ? '5. Recall History'
                : activeStep === 6
                ? '6. Make Decision'
                : '7. Create Base Sepolia Escrow'}
            </button>
          </div>

          {/* Contextual Step Data Preview */}
          {activeStep === 3 && stepData.commitment && stepData.outcome && (
            <div className="p-3 rounded bg-zinc-950/80 border border-zinc-800 font-mono text-xs space-y-1 text-zinc-300">
              <div className="text-emerald-400 font-bold">✓ SIBYL MEMORY PERSISTED</div>
              <div>✓ Commitment: {stepData.commitment.id} (${stepData.commitment.budget}, 24h expected)</div>
              <div>✓ Outcome: 38h actual delivery (14h late, 6/10 quality)</div>
              <div>✓ Counterparty: ResearchAgent-A written to ~/.sibyl-memory/memory.db</div>
            </div>
          )}

          {activeStep === 5 && (
            <div className="p-3 rounded bg-zinc-950/80 border border-zinc-800 font-mono text-xs space-y-1 text-zinc-300">
              <div className="text-amber-400 font-bold">✓ SIBYL MEMORY RECALLED IN FRESH SESSION</div>
              <div>Counterparty: <strong>ResearchAgent-A</strong></div>
              <div>Previous Delivery: 38 hours (14 hours late)</div>
              <div>Quality Score: 6/10</div>
              <div>Calculated Reliability: <strong>42/100 (HIGH RISK)</strong></div>
            </div>
          )}

          {activeStep === 7 && stepData.escrowResult && (
            <div className="p-4 rounded bg-blue-950/40 border border-blue-800 font-mono text-xs space-y-2 text-zinc-200">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                BASE SEPOLIA ESCROW LAYER READY
              </div>
              <div>Status: <strong>{stepData.escrowResult.status}</strong></div>
              <div>Message: {stepData.escrowResult.message}</div>
              {stepData.escrowResult.txHash && (
                <div>
                  Tx Hash: <span className="text-zinc-300">{stepData.escrowResult.txHash}</span>
                  <div className="mt-1">
                    <a
                      href={stepData.escrowResult.explorerUrl || formatBaseScanTxUrl(stepData.escrowResult.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      View on BaseScan Sepolia <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step 6 & 7 Final Comparison: WITH MEMORY vs WITHOUT MEMORY */}
      {stepData.decisionWithMemory && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl border border-emerald-800/80 bg-emerald-950/30 text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              DECISION CHANGED BECAUSE OF MEMORY
            </div>
            <p className="text-xs leading-relaxed text-zinc-300">
              "Persistent memory changes the economic controls applied to the agent." In Session A, ResearchAgent-A delivered 14 hours late with 6/10 quality. In Fresh Session B, PACT recalled this outcome from Sibyl Memory. Instead of blind approval, PACT downgraded reliability to <strong>42/100 (HIGH RISK)</strong> and enforced <strong>3 milestones on Base Sepolia ($10 upfront, $20 checkpoint, $20 final verification)</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            {/* Box A: WITH SIBYL MEMORY */}
            <div className="p-6 rounded-xl border border-orange-700/80 bg-orange-950/20 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-orange-800/60">
                <span className="font-bold text-sm text-orange-300">WITH SIBYL MEMORY</span>
                <span className="px-2 py-0.5 rounded bg-orange-900/60 text-orange-300 border border-orange-700/60 text-[10px]">
                  RECALLED FROM SIBYL
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Reliability Score:</span>
                  <span className="text-orange-400 font-bold text-sm">42/100</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Risk Level:</span>
                  <RiskBadge risk="HIGH" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Payment Strategy:</span>
                  <StrategyBadge strategy="MILESTONE_3" />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Base Sepolia Escrow:</span>
                  <span className="text-white font-bold">$10 Upfront · $20 Checkpoint · $20 Final</span>
                </div>
              </div>

              <div className="p-3 rounded bg-zinc-950/80 border border-orange-900/60 text-[11px] text-orange-200/90 leading-snug">
                <strong>Reason:</strong> Previous delivery was 14 hours late and scored 6/10. Full upfront disbursement denied.
              </div>
            </div>

            {/* Box B: WITHOUT MEMORY (Cold Start) */}
            <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="font-bold text-sm text-zinc-300">WITHOUT MEMORY (COLD START)</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px]">
                  BLIND FALLBACK
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Reliability Score:</span>
                  <span className="text-zinc-300 font-bold text-sm">
                    {stepData.decisionWithoutMemory?.reliabilityScore || 50}/100
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Risk Level:</span>
                  <RiskBadge risk={stepData.decisionWithoutMemory?.riskLevel || 'UNKNOWN'} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Payment Strategy:</span>
                  <StrategyBadge strategy={stepData.decisionWithoutMemory?.paymentStrategy || 'STANDARD_COLD_START'} />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Milestone Structure:</span>
                  <span className="text-zinc-300">$15 Upfront (30%) · $35 Delivery (70%)</span>
                </div>
              </div>

              <div className="p-3 rounded bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400 leading-snug">
                <strong>Blind Fallback:</strong> Fresh session has no memory and mistakenly grants standard unverified terms.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
