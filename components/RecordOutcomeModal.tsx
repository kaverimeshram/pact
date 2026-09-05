'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Commitment } from '@/lib/types';

interface RecordOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  commitment: Commitment | null;
  onOutcomeRecorded: () => void;
}

export const RecordOutcomeModal: React.FC<RecordOutcomeModalProps> = ({
  isOpen,
  onClose,
  commitment,
  onOutcomeRecorded,
}) => {
  const [actualHours, setActualHours] = useState(38);
  const [qualityScore, setQualityScore] = useState(6);
  const [success, setSuccess] = useState(true);
  const [disputed, setDisputed] = useState(false);
  const [notes, setNotes] = useState('Delivered late with quality below promised standard');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !commitment) return null;

  const expectedHours = commitment.expectedDeadlineHours || 24;
  const delay = Math.max(0, actualHours - expectedHours);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitmentId: commitment.id,
          counterpartyName: commitment.counterpartyName,
          actualDeliveryHours: Number(actualHours),
          delayHours: delay,
          qualityScore: Number(qualityScore),
          success,
          disputed,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onOutcomeRecorded();
        onClose();
      } else {
        alert(data.error || 'Failed to record outcome');
      }
    } catch (err) {
      console.error('Outcome recording error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-[#121215] p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Record Commitment Outcome</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase block">Commitment</span>
            <div className="text-white font-bold font-sans text-sm">{commitment.task}</div>
            <div className="text-zinc-400 text-[11px]">
              Agent: {commitment.counterpartyName} · Promised: {expectedHours}h · Quality: {commitment.expectedQuality}/10
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-zinc-400 uppercase">Actual Hours ({expectedHours}h expected)</label>
              <input
                type="number"
                value={actualHours}
                onChange={(e) => setActualHours(Number(e.target.value))}
                className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-white focus:outline-none"
              />
              {delay > 0 && (
                <span className="text-[10px] text-orange-400">+{delay} hours delay penalty</span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase">Quality Score (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={qualityScore}
                onChange={(e) => setQualityScore(Number(e.target.value))}
                className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400 uppercase font-sans">Verification Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-white font-sans text-sm focus:outline-none"
            />
          </div>

          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={success}
                onChange={(e) => setSuccess(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-blue-500"
              />
              <span className="text-zinc-300">Delivered successfully</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={disputed}
                onChange={(e) => setDisputed(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-blue-500"
              />
              <span className="text-zinc-300">Contract disputed</span>
            </label>
          </div>

          <div className="p-3 rounded bg-orange-950/30 border border-orange-800/60 text-[11px] text-orange-200">
            This outcome will be committed to Sibyl Memory. Future sessions will recall this delivery delay to recalibrate counterparty risk and payment terms.
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
              {loading ? 'Committing to Sibyl...' : 'Save & Persist Outcome'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
