import React from 'react';
import { RiskLevel, PaymentStrategyType, CommitmentStatus } from '@/lib/types';

export const RiskBadge: React.FC<{ risk: RiskLevel }> = ({ risk }) => {
  switch (risk) {
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-red-950/80 text-red-400 border border-red-800/80">
          CRITICAL RISK
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-orange-950/80 text-orange-400 border border-orange-800/80">
          HIGH RISK
        </span>
      );
    case 'MODERATE':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-yellow-950/80 text-yellow-400 border border-yellow-800/80">
          MODERATE RISK
        </span>
      );
    case 'LOW':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
          LOW RISK
        </span>
      );
    case 'UNKNOWN':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-900 text-zinc-400 border border-zinc-700">
          UNKNOWN / COLD START
        </span>
      );
  }
};

export const StrategyBadge: React.FC<{ strategy?: PaymentStrategyType }> = ({ strategy }) => {
  switch (strategy) {
    case 'MILESTONE_3':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-950/70 text-amber-300 border border-amber-800/60">
          3 MILESTONES (ESCROW)
        </span>
      );
    case 'STRICT_ESCROW_NO_UPFRONT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-red-950/70 text-red-300 border border-red-800/60">
          0% UPFRONT ESCROW
        </span>
      );
    case 'SPLIT_50_50':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-950/70 text-blue-300 border border-blue-800/60">
          50/50 SPLIT
        </span>
      );
    case 'FULL_UPFRONT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
          100% UPFRONT
        </span>
      );
    case 'STANDARD_COLD_START':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
          COLD-START TERMS (30/70)
        </span>
      );
  }
};

export const StatusBadge: React.FC<{ status: CommitmentStatus }> = ({ status }) => {
  switch (status) {
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
          COMPLETED
        </span>
      );
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-950/60 text-blue-400 border border-blue-800/50">
          ACTIVE
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-red-950/60 text-red-400 border border-red-800/50">
          FAILED
        </span>
      );
    case 'DISPUTED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-950/60 text-purple-400 border border-purple-800/50">
          DISPUTED
        </span>
      );
    case 'PROPOSED':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
          PROPOSED
        </span>
      );
  }
};
