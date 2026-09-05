'use client';

import React, { useState } from 'react';
import { X, FileCheck, Coins, Clock, Sparkles } from 'lucide-react';
import { Counterparty } from '@/lib/types';

interface CreateCommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  counterparties: Counterparty[];
  onCommitmentCreated: () => void;
}

export const CreateCommitmentModal: React.FC<CreateCommitmentModalProps> = ({
  isOpen,
  onClose,
  counterparties,
  onCommitmentCreated,
}) => {
  const [agentName, setAgentName] = useState('ResearchAgent-A');
  const [task, setTask] = useState('Market Research & Competitor Landscape');
  const [budget, setBudget] = useState(50);
  const [expectedHours, setExpectedHours] = useState(24);
  const [expectedQuality, setExpectedQuality] = useState(8);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterpartyName: agentName,
          task,
          budget: Number(budget),
          expectedDeadlineHours: Number(expectedHours),
          expectedQuality: Number(expectedQuality),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onCommitmentCreated();
        onClose();
      } else {
        alert(data.error || 'Failed to create commitment');
      }
    } catch (err) {
      console.error('Commitment creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-[#121215] p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-400" />
            <h2 className="text-base font-bold text-white">Create New Commitment</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="space-y-1">
            <label className="text-zinc-400 uppercase">Counterparty Agent</label>
            <select
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-white focus:outline-none"
            >
              <option value="ResearchAgent-A">ResearchAgent-A</option>
              <option value="CodeAuditAgent-X">CodeAuditAgent-X</option>
              {counterparties
                .filter((c) => c.name !== 'ResearchAgent-A' && c.name !== 'CodeAuditAgent-X')
                .map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400 uppercase font-sans">Task Deliverable</label>
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              required
              className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-white font-sans text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-zinc-400 uppercase">Budget ($)</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase">Deadline (h)</label>
              <input
                type="number"
                value={expectedHours}
                onChange={(e) => setExpectedHours(Number(e.target.value))}
                className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase">Min Quality</label>
              <input
                type="number"
                min={1}
                max={10}
                value={expectedQuality}
                onChange={(e) => setExpectedQuality(Number(e.target.value))}
                className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400">
            Commitment will be persisted to Sibyl Memory as an entity with COLD-tier journal indexing.
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-sans text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-white hover:bg-zinc-200 text-zinc-950 font-bold font-sans text-xs shadow"
            >
              {loading ? 'Persisting to Sibyl...' : 'Create Commitment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
