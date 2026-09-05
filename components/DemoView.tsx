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
} from 'lucide-react';
import { Decision } from '@/lib/types';
import { RiskBadge, StrategyBadge } from './Badge';

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
  }>({});

  const executeStep = async (step: number) => {
    setLoading(true);
    try {
      if (step === 1) {
        // Step 1: Create Commitment
        const res = await fetch('/api/commitments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'comm-hackathon-01',
            counterpartyName: 'ResearchAgent-A',
            task: 'Market Research Report on AI Agent Protocols',
            budget: 50,
            expectedDeadlineHours: 24,
            expectedQuality: 8,
          }),
        });
        const data = await res.json();
        setStepData((prev) => ({ ...prev, commitment: data.commitment }));
        setActiveStep(2);
      } else if (step === 2) {
        // Step 2: Record Bad Outcome & Step 3: Persist to Sibyl
        const res = await fetch('/api/outcomes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commitmentId: 'comm-hackathon-01',
            counterpartyName: 'ResearchAgent-A',
            actualDeliveryHours: 38,
            delayHours: 14,
            qualityScore: 6,
            success: true,
            notes: 'Delivered 14h late, quality score 6/10 (below expected 8/10)',
          }),
        });
        const data = await res.json();
        setStepData((prev) => ({ ...prev, outcome: data.outcome }));
        setActiveStep(4);
      } else if (step === 4) {
        // Step 4: Start Fresh Session
        onFreshSession();
        setActiveStep(5);
      } else if (step === 5) {
        // Step 5: Recall History from Sibyl
        const res = await fetch('/api/memory?query=ResearchAgent-A');
        const data = await res.json();
        setStepData((prev) => ({ ...prev, recalled: data }));
        setActiveStep(6);
      } else if (step === 6) {
        // Step 6 & 7: Evaluate $50 task WITH Memory
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

        // Also evaluate WITHOUT Memory for side-by-side proof
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
      title: 'Create Initial Commitment',
      desc: 'ResearchAgent-A promises a research report within 24h for $50.',
    },
    {
      num: 2,
      title: 'Record Bad Outcome',
      desc: 'Agent delivers after 38h (14h late) with quality 6/10.',
    },
    {
      num: 3,
      title: 'Persist into Sibyl Memory',
      desc: 'Commitment, outcome, and COLD journal event stored in SQLite.',
    },
    {
      num: 4,
      title: 'Start Fresh Session',
      desc: 'Clear local session variables to prove cross-session recall.',
    },
    {
      num: 5,
      title: 'Recall History from Sibyl',
      desc: 'Fresh session queries Sibyl FTS5 store for past history.',
    },
    {
      num: 6,
      title: 'Evaluate New $50 Task',
      desc: 'User requests: "I need a research agent for a $50 task."',
    },
    {
      num: 7,
      title: 'Inspect Changed Decision',
      desc: 'Reputation drops to 42 → Enforces 3 milestones & 0 full upfront.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-zinc-800 bg-[#121215]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white">Interactive Guided Demo</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            "See why memory matters": A complete end-to-end walk-through of the official hackathon scenario.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-colors border border-zinc-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Demo State
        </button>
      </div>

      {/* Step Tracker Bar */}
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
                <div className="text-[11px] font-semibold font-sans truncate">{s.title}</div>
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

            {activeStep < 7 && (
              <button
                id={`btn-demo-step-${activeStep}`}
                onClick={() => executeStep(activeStep)}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs font-mono transition-all shadow active:scale-95 self-start sm:self-auto"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {loading ? 'Processing...' : activeStep === 4 ? 'Start Fresh Session' : 'Execute Step'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step 7 Final Comparison: WITH MEMORY vs WITHOUT MEMORY */}
      {activeStep === 7 && stepData.decisionWithMemory && stepData.decisionWithoutMemory && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl border border-emerald-800/80 bg-emerald-950/30 text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              DEMO COMPLETE: MEMORY MATERIALLY CHANGED THE DECISION
            </div>
            <p className="text-xs leading-relaxed text-zinc-300">
              In Session A, ResearchAgent-A delivered 14 hours late with 6/10 quality. In Fresh Session B, PACT recalled this outcome from Sibyl Memory. Instead of blind approval, PACT downgraded reliability to 42/100 and enforced a 3-milestone escrow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            {/* Box A: WITH MEMORY */}
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
                  <span className="text-orange-400 font-bold text-sm">
                    {stepData.decisionWithMemory.reliabilityScore}/100
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Risk Classification:</span>
                  <RiskBadge risk={stepData.decisionWithMemory.riskLevel} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Payment Strategy:</span>
                  <StrategyBadge strategy={stepData.decisionWithMemory.paymentStrategy} />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Milestone Structure:</span>
                  <span className="text-white font-bold">$10 Upfront · $20 Checkpoint · $20 Final</span>
                </div>
              </div>

              <div className="p-3 rounded bg-zinc-950/80 border border-orange-900/60 text-[11px] text-orange-200/90 leading-snug">
                <strong>Reasoning: </strong>
                {stepData.decisionWithMemory.reasoning}
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
                    {stepData.decisionWithoutMemory.reliabilityScore}/100
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Risk Classification:</span>
                  <RiskBadge risk={stepData.decisionWithoutMemory.riskLevel} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Payment Strategy:</span>
                  <StrategyBadge strategy={stepData.decisionWithoutMemory.paymentStrategy} />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Milestone Structure:</span>
                  <span className="text-zinc-300">$15 Upfront (30%) · $35 Delivery (70%)</span>
                </div>
              </div>

              <div className="p-3 rounded bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400 leading-snug">
                <strong>Reasoning: </strong>
                {stepData.decisionWithoutMemory.reasoning}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
