'use client';

import React from 'react';
import {
  Database,
  RefreshCw,
  Layers,
  Users,
  FileCheck,
  Cpu,
  Sparkles,
  Bot,
  ShieldAlert,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sessionId: string;
  onFreshSession: () => void;
  sibylStatus: { status: string; exists: boolean; schema_version: number } | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  sessionId,
  onFreshSession,
  sibylStatus,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'agent', label: 'Agent', icon: Bot, highlight: true },
    { id: 'counterparties', label: 'Counterparties', icon: Users },
    { id: 'commitments', label: 'Commitments', icon: FileCheck },
    { id: 'memory', label: 'Memory', icon: Database },
    { id: 'decisions', label: 'Decisions', icon: Cpu },
    { id: 'demo', label: 'Demo', icon: Sparkles },
  ];

  return (
    <header className="border-b border-zinc-800 bg-[#0c0c0e] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-6">
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="w-8 h-8 rounded bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
                P
              </div>
              <div>
                <span className="font-semibold text-lg tracking-tight text-white flex items-center gap-2">
                  PACT
                  <span className="text-[10px] font-mono tracking-normal uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    Sibyl 2026
                  </span>
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`nav-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-zinc-800 text-white border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    } ${tab.highlight && !isActive ? 'text-blue-400 hover:text-blue-300' : ''}`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${tab.highlight && !isActive ? 'text-blue-400' : ''}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Session Status & Sibyl Status */}
          <div className="flex items-center space-x-3">
            {/* Sibyl Status Badge */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-zinc-400 font-mono text-[11px]">Sibyl Memory:</span>
              <span className="text-emerald-400 font-medium font-mono text-[11px]">
                {sibylStatus?.status === 'connected' ? 'Connected' : 'Active'} (v{sibylStatus?.schema_version || 4})
              </span>
            </div>

            {/* Session Indicator & Fresh Session Button */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <div className="flex flex-col text-right pr-1">
                <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Current Session</span>
                <span className="text-xs font-mono text-zinc-300 font-semibold">{sessionId}</span>
              </div>
              <button
                id="btn-fresh-session"
                onClick={onFreshSession}
                title="Discard local session state and start a fresh session to test cross-session memory recall"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-all active:scale-95"
              >
                <RefreshCw className="w-3 h-3 text-zinc-400" />
                <span className="hidden sm:inline">Fresh Session</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
