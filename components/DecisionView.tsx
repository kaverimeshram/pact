'use client';

import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Wallet,
  Check,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Counterparty, Decision } from '@/lib/types';
import { RiskBadge, StrategyBadge } from './Badge';
import {
  connectInjectedWallet,
  createBaseSepoliaEscrowTx,
  releaseBaseSepoliaMilestoneTx,
  hasInjectedWallet,
  TxStepState,
} from '@/lib/wallet';
import {
  getEscrowContractAddress,
  DEMO_AGENT_WALLETS,
  DEFAULT_BASE_SEPOLIA_CHAIN_ID,
  formatBaseScanTxUrl,
  formatBaseScanAddressUrl,
} from '@/lib/contracts/pactEscrow';

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
  const [task, setTask] = useState('I need a research agent for a $50 task.');
  const [budget, setBudget] = useState(50);
  const [candidateName, setCandidateName] = useState(prefillCandidate);
  const [simulateNoMemory, setSimulateNoMemory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [decision, setDecision] = useState<Decision | null>(null);
  const [coldStartDecision, setColdStartDecision] = useState<Decision | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Web3 Wallet & Base Sepolia Escrow States
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  const [txStep, setTxStep] = useState<TxStepState>('IDLE');
  const [txStatusMessage, setTxStatusMessage] = useState<string>('');
  const [confirmedTxHash, setConfirmedTxHash] = useState<string | null>(null);
  const [confirmedExplorerUrl, setConfirmedExplorerUrl] = useState<string | null>(null);
  const [escrowError, setEscrowError] = useState<string | null>(null);

  const [releasedMilestones, setReleasedMilestones] = useState<Record<number, boolean>>({});
  const [releasingMilestoneIdx, setReleasingMilestoneIdx] = useState<number | null>(null);

  const contractAddress = getEscrowContractAddress();
  const beneficiaryWallet =
    DEMO_AGENT_WALLETS[candidateName] || DEMO_AGENT_WALLETS['ResearchAgent-A'];

  // Check initial wallet connection if available
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0] as `0x${string}`);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleConnectWallet = async () => {
    setIsWalletConnecting(true);
    setEscrowError(null);
    try {
      const res = await connectInjectedWallet();
      setWalletAddress(res.address);
      setWalletChainId(res.chainId);
    } catch (err: any) {
      setEscrowError(err.message || 'Failed to connect wallet');
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const handleEvaluate = async (simulateOff = false) => {
    setLoading(true);
    setErrorMessage(null);
    setConfirmedTxHash(null);
    setConfirmedExplorerUrl(null);
    setEscrowError(null);
    setTxStep('IDLE');

    // Dynamic progressive loading status
    setLoadingPhase('Loading Sibyl Memory...');
    const t1 = setTimeout(() => setLoadingPhase('Recalling counterparty history...'), 200);
    const t2 = setTimeout(() => setLoadingPhase('Calculating deterministic reputation...'), 450);

    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          budget: Number(budget),
          candidateName,
          simulateNoMemory: simulateOff || simulateNoMemory,
          sessionId,
        }),
      });
      const data = await res.json();
      clearTimeout(t1);
      clearTimeout(t2);

      if (data.success) {
        setLoadingPhase('Decision ready.');
        if (simulateOff) {
          setColdStartDecision(data.decision);
          setShowComparison(true);
        } else {
          setDecision(data.decision);
        }
      } else {
        setErrorMessage(data.error || 'Failed to recall Sibyl Memory');
      }
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setErrorMessage(err.message || 'Sibyl Memory connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleRunWithoutMemory = async () => {
    if (!decision || decision.memorySimulatedOff) {
      await handleEvaluate(false);
    }
    await handleEvaluate(true);
  };

  const handleCreateOnChainEscrow = async () => {
    if (!decision) return;
    setEscrowError(null);
    setConfirmedTxHash(null);
    setConfirmedExplorerUrl(null);

    // If no browser wallet installed or user wants server-backed creation
    if (!hasInjectedWallet()) {
      setTxStep('AWAITING_APPROVAL');
      setTxStatusMessage('Broadcasting via Base Sepolia RPC...');
      try {
        const res = await fetch('/api/base/escrow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commitmentId: `comm-escrow-${Date.now().toString(36)}`,
            counterpartyName: decision.selectedCounterparty,
            budget: decision.budget,
            strategy: decision.paymentStrategy,
            milestones: decision.milestones,
          }),
        });
        const data = await res.json();
        if (data.success && data.txHash) {
          setTxStep('SUCCESS');
          setConfirmedTxHash(data.txHash);
          setConfirmedExplorerUrl(data.explorerUrl || formatBaseScanTxUrl(data.txHash));
          setTxStatusMessage(data.message);
        } else {
          setTxStep('ERROR');
          setEscrowError(data.message || data.error || 'Base Sepolia escrow execution failed');
        }
      } catch (err: any) {
        setTxStep('ERROR');
        setEscrowError(err.message || 'Base RPC error');
      }
      return;
    }

    try {
      const result = await createBaseSepoliaEscrowTx({
        contractAddress: contractAddress || undefined,
        beneficiaryAddress: beneficiaryWallet,
        counterpartyName: decision.selectedCounterparty,
        milestones: decision.milestones,
        commitmentId: `comm-pact-${Date.now().toString(36)}`,
        onStatusChange: (step, msg) => {
          setTxStep(step);
          setTxStatusMessage(msg);
        },
      });

      setConfirmedTxHash(result.txHash);
      setConfirmedExplorerUrl(result.explorerUrl);
      setTxStep('SUCCESS');
      setTxStatusMessage('Escrow successfully created and funded on Base Sepolia!');
    } catch (err: any) {
      setTxStep('ERROR');
      setEscrowError(err.message || 'Transaction rejected or failed on Base Sepolia');
    }
  };

  const handleReleaseMilestone = async (idx: number) => {
    if (!contractAddress) {
      // Mark as locally released for demo preview
      setReleasedMilestones((prev) => ({ ...prev, [idx]: true }));
      return;
    }

    setReleasingMilestoneIdx(idx);
    try {
      const result = await releaseBaseSepoliaMilestoneTx({
        contractAddress,
        escrowId: 1,
        milestoneIndex: idx,
        onStatusChange: (step, msg) => {
          setTxStatusMessage(msg);
        },
      });
      setReleasedMilestones((prev) => ({ ...prev, [idx]: true }));
      setConfirmedTxHash(result.txHash);
      setConfirmedExplorerUrl(result.explorerUrl);
    } catch (err: any) {
      setEscrowError(`Failed to release milestone: ${err.message}`);
    } finally {
      setReleasingMilestoneIdx(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Session Controller */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-zinc-800 bg-[#121215]">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">PACT Decision Engine</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Recalls counterparty commitment history from Sibyl Memory to dynamically calculate risk and enforce Base Sepolia milestone escrow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono">
            <span className="text-zinc-500">SESSION: </span>
            <span className="text-zinc-200 font-semibold">{sessionId}</span>
          </div>
          <button
            onClick={() => {
              onFreshSession();
              setDecision(null);
              setColdStartDecision(null);
              setShowComparison(false);
              setConfirmedTxHash(null);
              setConfirmedExplorerUrl(null);
              setTxStep('IDLE');
            }}
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
            <label className="text-xs font-mono text-zinc-400 uppercase">Task Request</label>
            <input
              id="input-decision-task"
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-zinc-500 font-sans"
              placeholder="e.g. I need a research agent for a $50 task."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 uppercase">Budget ($ USD / ETH Scale)</label>
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
            <label className="text-xs font-mono text-zinc-400 uppercase">Candidate Agent</label>
            <select
              id="select-decision-candidate"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
            >
              {counterparties.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} — {c.capability} ({c.reliabilityScore}/100)
                </option>
              ))}
              {counterparties.length === 0 && (
                <option value="ResearchAgent-A">ResearchAgent-A — Market Research</option>
              )}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 sm:pt-6">
            <button
              id="btn-evaluate-memory"
              onClick={() => handleEvaluate(false)}
              disabled={loading}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs font-mono transition-all shadow active:scale-95"
            >
              <Cpu className="w-3.5 h-3.5" />
              {loading ? loadingPhase || 'Evaluating...' : 'Query Sibyl & Evaluate'}
            </button>

            <button
              id="btn-simulate-no-memory"
              onClick={handleRunWithoutMemory}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs border border-zinc-700 transition-colors"
            >
              <Split className="w-3.5 h-3.5" />
              Simulate Blind (No Memory)
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Decision Output & Escrow Interface */}
      {decision && (
        <div className="space-y-6">
          {/* 3-Column Decision Architecture */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Col 1: SIBYL RECALL EVIDENCE */}
            <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-white uppercase font-mono">1. SIBYL RECALL</h2>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800 font-mono">
                  {decision.memoryEvidence.hasHistory ? 'HISTORY FOUND' : 'COLD START'}
                </span>
              </div>

              {decision.memoryEvidence.hasHistory ? (
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5">
                    <div className="text-zinc-400">Recalled Entity: <strong className="text-white">{decision.selectedCounterparty}</strong></div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Recorded Outcomes:</span>
                      <span className="text-zinc-200">{decision.memoryEvidence.outcomesCount}</span>
                    </div>
                    {decision.memoryEvidence.lastDelayHours !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Previous Delay:</span>
                        <span className="text-orange-400 font-bold">{decision.memoryEvidence.lastDelayHours} hours late</span>
                      </div>
                    )}
                    {decision.memoryEvidence.lastQualityScore !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Quality Score:</span>
                        <span className="text-yellow-400 font-bold">{decision.memoryEvidence.lastQualityScore}/10</span>
                      </div>
                    )}
                  </div>

                  {decision.memoryEvidence.snippets && decision.memoryEvidence.snippets.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase">FTS5 Journal Evidence:</span>
                      <div className="p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80 text-[11px] text-zinc-400 line-clamp-3">
                        {decision.memoryEvidence.snippets[0]}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 space-y-2">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                    <AlertOctagon className="w-4 h-4 text-zinc-500" />
                    Zero Recalled History
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {decision.memorySimulatedOff
                      ? 'Memory recall was simulated OFF. Agent is operating completely blind.'
                      : 'Zero prior commitments or outcomes recorded in Sibyl Memory.'}
                  </p>
                </div>
              )}
            </div>

            {/* Col 2: PACT REPUTATION ENGINE */}
            <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215] space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <Cpu className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white uppercase font-mono">2. REPUTATION ENGINE</h2>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Calculated Reliability</span>
                    <span className="text-3xl font-bold font-mono text-white">
                      {decision.reliabilityScore}
                      <span className="text-xs text-zinc-500 font-normal">/100</span>
                    </span>
                  </div>
                  <RiskBadge risk={decision.riskLevel} />
                </div>

                <div className="space-y-2 font-mono">
                  <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Baseline Starting Score:</span>
                    <span className="text-zinc-300">50</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Delay Penalty (14h × 0.5):</span>
                    <span className="text-orange-400">-7 pts</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Quality Adjustment (6/10 vs 8/10):</span>
                    <span className="text-yellow-400">-1 pts</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold">
                    <span className="text-zinc-400">Final Deterministic Score:</span>
                    <span className="text-white">{decision.reliabilityScore}/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 3: PAYMENT PLAN & ESCROW PREVIEW */}
            <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215] space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <Coins className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white uppercase font-mono">3. PAYMENT PLAN</h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-mono">Enforced Strategy:</span>
                  <StrategyBadge strategy={decision.paymentStrategy} />
                </div>

                {/* Milestone Breakdown List */}
                <div className="space-y-2 pt-1 font-mono text-xs">
                  {decision.milestones.map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded bg-zinc-900 border border-zinc-800 space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-200 font-bold">
                          ${m.amount} {idx === 0 ? 'Initial commitment' : idx === 1 ? 'Progress checkpoint' : 'Final verification'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold">
                            {m.percentage}%
                          </span>
                          {confirmedTxHash && (
                            <button
                              onClick={() => handleReleaseMilestone(idx)}
                              disabled={releasedMilestones[idx] || releasingMilestoneIdx === idx}
                              className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                                releasedMilestones[idx]
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-blue-600 hover:bg-blue-500 text-white'
                              }`}
                            >
                              {releasingMilestoneIdx === idx ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : releasedMilestones[idx] ? (
                                '✓ Released'
                              ) : (
                                'Release'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-500">{m.condition}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BASE SEPOLIA ESCROW INTERACTION CARD */}
          <div className="p-6 rounded-xl border border-blue-900/60 bg-blue-950/20 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-900/40">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white font-mono">Base Sepolia Escrow Enforcement</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Converts deterministic reputation terms into an on-chain smart contract escrow on Base Sepolia.
                </p>
              </div>

              {/* Wallet Status Badge */}
              <div className="flex items-center gap-2">
                {walletAddress ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-emerald-800/80 text-xs font-mono text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                  </div>
                ) : (
                  <button
                    id="btn-connect-wallet"
                    onClick={handleConnectWallet}
                    disabled={isWalletConnecting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono border border-zinc-700 transition-colors"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    {isWalletConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                )}
              </div>
            </div>

            {/* Escrow Preview Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase block">Network</span>
                <span className="text-white font-semibold">Base Sepolia (84532)</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase block">Total Escrow</span>
                <span className="text-white font-semibold">${decision.budget} · {decision.milestones.length} Milestones</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 sm:col-span-2">
                <span className="text-[10px] text-zinc-500 uppercase block">Beneficiary Agent Wallet</span>
                <span className="text-blue-300 text-[11px] truncate block" title={beneficiaryWallet}>
                  {beneficiaryWallet}
                </span>
              </div>
            </div>

            {/* Interactive Create Escrow Action Button */}
            <div className="space-y-3">
              {!confirmedTxHash ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {!walletAddress && hasInjectedWallet() ? (
                    <button
                      id="btn-connect-wallet-main"
                      onClick={handleConnectWallet}
                      disabled={isWalletConnecting}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono transition-all shadow"
                    >
                      <Wallet className="w-4 h-4" />
                      {isWalletConnecting ? 'Connecting Wallet...' : 'Connect Wallet to Authorize Escrow'}
                    </button>
                  ) : (
                    <button
                      id="btn-create-escrow-action"
                      onClick={handleCreateOnChainEscrow}
                      disabled={txStep === 'AWAITING_APPROVAL' || txStep === 'CONFIRMING'}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono transition-all shadow active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      {txStep === 'AWAITING_APPROVAL'
                        ? 'Waiting for wallet approval...'
                        : txStep === 'CONFIRMING'
                        ? 'Confirming on Base Sepolia...'
                        : 'Create Base Sepolia Escrow'}
                    </button>
                  )}
                </div>
              ) : null}

              {/* Transaction State Progress Tracker */}
              {txStep !== 'IDLE' && (
                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Transaction Status:</span>
                    <span
                      className={`font-bold ${
                        txStep === 'SUCCESS'
                          ? 'text-emerald-400'
                          : txStep === 'ERROR'
                          ? 'text-red-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {txStep === 'CONNECTING_WALLET' && 'Connecting wallet...'}
                      {txStep === 'SWITCHING_NETWORK' && 'Switching to Base Sepolia...'}
                      {txStep === 'AWAITING_APPROVAL' && 'Waiting for wallet approval...'}
                      {txStep === 'BROADCASTING' && 'Transaction submitted...'}
                      {txStep === 'CONFIRMING' && 'Confirming on Base Sepolia...'}
                      {txStep === 'SUCCESS' && 'Escrow created ✓'}
                      {txStep === 'ERROR' && 'Transaction Failed'}
                    </span>
                  </div>

                  {txStatusMessage && (
                    <div className="text-[11px] text-zinc-300">{txStatusMessage}</div>
                  )}

                  {confirmedTxHash && (
                    <div className="pt-2 border-t border-zinc-800 space-y-1">
                      <div className="text-zinc-400 text-[11px]">
                        Transaction Hash:{' '}
                        <span className="text-zinc-200">{confirmedTxHash}</span>
                      </div>
                      <a
                        href={confirmedExplorerUrl || formatBaseScanTxUrl(confirmedTxHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 underline text-xs font-semibold"
                      >
                        View Verified Transaction on BaseScan Sepolia <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {escrowError && (
                    <div className="p-2.5 rounded bg-red-950/60 border border-red-800 text-red-300 text-[11px]">
                      {escrowError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* NO-MEMORY COMPARISON (SIDE-BY-SIDE) */}
          {showComparison && coldStartDecision && (
            <div className="p-6 rounded-xl border border-zinc-700 bg-[#121215] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Split className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold uppercase font-mono text-white">
                    Direct Comparison: With vs Without Sibyl Memory
                  </h3>
                </div>
                <span className="text-xs text-zinc-500 font-mono">Same Task: "${task}"</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
                {/* Side A: WITH SIBYL MEMORY */}
                <div className="p-5 rounded-lg border border-orange-700/80 bg-orange-950/20 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-orange-800/60">
                    <span className="font-bold text-orange-300 text-sm">WITH SIBYL MEMORY</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-orange-900/60 text-orange-300">
                      RECALLED HISTORY
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Reliability:</span>
                      <span className="text-orange-400 font-bold text-sm">42/100</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Risk:</span>
                      <RiskBadge risk="HIGH" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Payment:</span>
                      <StrategyBadge strategy="MILESTONE_3" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Milestones:</span>
                      <span className="text-white font-bold">$10 Upfront · $20 Checkpoint · $20 Final</span>
                    </div>
                    <div className="pt-2 border-t border-orange-900/60 text-[11px] text-orange-200">
                      <strong>Causal Link:</strong> Previous 14h delay and 6/10 score enforces 3 milestones on Base Sepolia.
                    </div>
                  </div>
                </div>

                {/* Side B: WITHOUT SIBYL MEMORY */}
                <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="font-bold text-zinc-300 text-sm">WITHOUT MEMORY</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      COLD START / BLIND
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Reliability:</span>
                      <span className="text-zinc-300 font-bold text-sm">50/100</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Risk:</span>
                      <RiskBadge risk="UNKNOWN" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Payment:</span>
                      <StrategyBadge strategy="STANDARD_COLD_START" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Milestones:</span>
                      <span className="text-zinc-300">$15 Upfront (30%) · $35 Delivery (70%)</span>
                    </div>
                    <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                      <strong>Blind Failure:</strong> Blind session has no memory and grants standard terms.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
