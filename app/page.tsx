'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { DashboardView } from '@/components/DashboardView';
import { CounterpartiesView } from '@/components/CounterpartiesView';
import { CommitmentsView } from '@/components/CommitmentsView';
import { DecisionView } from '@/components/DecisionView';
import { MemoryView } from '@/components/MemoryView';
import { DemoView } from '@/components/DemoView';
import { CreateCommitmentModal } from '@/components/CreateCommitmentModal';
import { RecordOutcomeModal } from '@/components/RecordOutcomeModal';
import { Counterparty, Commitment, Outcome, SibylJournalEvent } from '@/lib/types';

function generateShortSessionId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'Session ';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function Home({ defaultTab = 'dashboard' }: { defaultTab?: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [sessionId, setSessionId] = useState(generateShortSessionId());
  const [sibylStatus, setSibylStatus] = useState<any>(null);

  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [journalEvents, setJournalEvents] = useState<SibylJournalEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isCreateCommitmentOpen, setIsCreateCommitmentOpen] = useState(false);
  const [selectedCommitmentForOutcome, setSelectedCommitmentForOutcome] = useState<Commitment | null>(null);
  const [evalCandidatePrefill, setEvalCandidatePrefill] = useState('ResearchAgent-A');

  const handleFreshSession = () => {
    const newSess = generateShortSessionId();
    setSessionId(newSess);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', tab === 'dashboard' ? '/' : `/${tab}`);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch counterparties
      const cpRes = await fetch('/api/counterparties');
      const cpData = await cpRes.json();
      if (cpData.success) {
        setCounterparties(cpData.counterparties || []);
      }

      // 2. Fetch commitments
      const commRes = await fetch('/api/commitments');
      const commData = await commRes.json();
      if (commData.success) {
        setCommitments(commData.commitments || []);
      }

      // 3. Fetch outcomes
      const outRes = await fetch('/api/outcomes');
      const outData = await outRes.json();
      if (outData.success) {
        setOutcomes(outData.outcomes || []);
      }

      // 4. Fetch memory status & journal
      const memRes = await fetch('/api/memory');
      const memData = await memRes.json();
      if (memData.success) {
        setSibylStatus(memData.status || null);
        setJournalEvents(memData.journalEvents || []);
      }
    } catch (err) {
      console.error('Error fetching PACT data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemoData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAllData();
      }
    } catch (err) {
      console.error('Seed demo error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleOpenEvaluate = (candidateName?: string) => {
    if (candidateName) {
      setEvalCandidatePrefill(candidateName);
    }
    handleTabChange('decisions');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-[#f4f4f5]">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        sessionId={sessionId}
        onFreshSession={handleFreshSession}
        sibylStatus={sibylStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            counterparties={counterparties}
            commitments={commitments}
            journalEvents={journalEvents}
            onNavigate={handleTabChange}
            onOpenCreateCommitment={() => setIsCreateCommitmentOpen(true)}
            onOpenEvaluate={handleOpenEvaluate}
            onSeedDemo={handleSeedDemoData}
            loading={loading}
          />
        )}

        {activeTab === 'counterparties' && (
          <CounterpartiesView
            counterparties={counterparties}
            commitments={commitments}
            outcomes={outcomes}
            onOpenEvaluate={handleOpenEvaluate}
            onOpenCreateCommitment={() => setIsCreateCommitmentOpen(true)}
            onOpenRecordOutcome={(c) => setSelectedCommitmentForOutcome(c)}
          />
        )}

        {activeTab === 'commitments' && (
          <CommitmentsView
            commitments={commitments}
            outcomes={outcomes}
            onOpenCreateCommitment={() => setIsCreateCommitmentOpen(true)}
            onOpenRecordOutcome={(c) => setSelectedCommitmentForOutcome(c)}
          />
        )}

        {(activeTab === 'decisions' || activeTab === 'decision') && (
          <DecisionView
            counterparties={counterparties}
            sessionId={sessionId}
            onFreshSession={handleFreshSession}
            prefillCandidate={evalCandidatePrefill}
          />
        )}

        {activeTab === 'memory' && <MemoryView sibylStatus={sibylStatus} />}

        {activeTab === 'demo' && (
          <DemoView
            sessionId={sessionId}
            onFreshSession={handleFreshSession}
            onRefreshAll={fetchAllData}
          />
        )}
      </main>

      {/* Modals */}
      <CreateCommitmentModal
        isOpen={isCreateCommitmentOpen}
        onClose={() => setIsCreateCommitmentOpen(false)}
        counterparties={counterparties}
        onCommitmentCreated={fetchAllData}
      />

      <RecordOutcomeModal
        isOpen={!!selectedCommitmentForOutcome}
        onClose={() => setSelectedCommitmentForOutcome(null)}
        commitment={selectedCommitmentForOutcome}
        onOutcomeRecorded={fetchAllData}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 bg-[#0c0c0e] text-zinc-500 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            PACT · Persistent Agent Commitment Tracker · Sibyl Labs Hackathon 2026
          </div>
          <div className="flex items-center gap-4">
            <span>Powered by Sibyl Memory Engine</span>
            <span>·</span>
            <span>Base Sepolia Escrow</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
