import { NextResponse } from 'next/server';
import {
  clearMemoryStore,
  persistCommitment,
  persistCounterparty,
  persistOutcome,
} from '@/lib/memory/sibyl';
import { aggregateCounterpartyStats } from '@/lib/reputation';
import { Commitment, Outcome } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = 'seed' } = body;

    // 1. Clear database
    await clearMemoryStore();

    if (action === 'clear') {
      return NextResponse.json({
        success: true,
        message: 'Sibyl Memory store cleared completely.',
      });
    }

    // 2. Seed the official hackathon scenario:
    // ResearchAgent-A promised market research in 24h, delivered in 38h (14h late) with quality 6/10.
    const commitmentId = 'comm-demo-001';
    const counterpartyId = 'agent-researchagent-a';
    const counterpartyName = 'ResearchAgent-A';

    const seedCommitment: Commitment = {
      id: commitmentId,
      counterpartyId,
      counterpartyName,
      task: 'Initial Market Research & Competitor Landscape Analysis',
      budget: 50,
      expectedDeadlineHours: 24,
      expectedQuality: 8,
      createdAt: '2026-09-01T08:00:00Z',
      status: 'COMPLETED',
      paymentStrategy: 'STANDARD_COLD_START',
    };

    const seedOutcome: Outcome = {
      commitmentId,
      counterpartyId,
      counterpartyName,
      actualDeliveryHours: 38,
      delayHours: 14,
      qualityScore: 6,
      success: true,
      disputed: false,
      notes: 'Delivered 14 hours late with 6/10 quality score (expected 8/10)',
      recordedAt: '2026-09-02T22:00:00Z',
    };

    // Persist entities to Sibyl Memory
    await persistCommitment(seedCommitment);
    await persistOutcome(seedOutcome);

    // Persist counterparty with recalculated reliability (~42, HIGH RISK)
    const stats = aggregateCounterpartyStats(
      counterpartyId,
      counterpartyName,
      'Market & Quantitative Research Specialist',
      [seedOutcome],
      [seedCommitment]
    );

    await persistCounterparty(stats);

    // Also seed another counterparty for comparison:
    // CodeAuditAgent-X: 2 on-time deliveries, quality 9/10, reliability 72 (LOW RISK)
    const comm2: Commitment = {
      id: 'comm-demo-002',
      counterpartyId: 'agent-codeauditagent-x',
      counterpartyName: 'CodeAuditAgent-X',
      task: 'Smart Contract Security Audit',
      budget: 120,
      expectedDeadlineHours: 48,
      expectedQuality: 9,
      createdAt: '2026-09-03T10:00:00Z',
      status: 'COMPLETED',
      paymentStrategy: 'SPLIT_50_50',
    };

    const outcome2: Outcome = {
      commitmentId: 'comm-demo-002',
      counterpartyId: 'agent-codeauditagent-x',
      counterpartyName: 'CodeAuditAgent-X',
      actualDeliveryHours: 44,
      delayHours: 0,
      qualityScore: 9,
      success: true,
      disputed: false,
      notes: 'Delivered 4h ahead of schedule, comprehensive audit report',
      recordedAt: '2026-09-05T06:00:00Z',
    };

    await persistCommitment(comm2);
    await persistOutcome(outcome2);

    const stats2 = aggregateCounterpartyStats(
      'agent-codeauditagent-x',
      'CodeAuditAgent-X',
      'Smart Contract Security & Static Analysis',
      [outcome2],
      [comm2]
    );
    await persistCounterparty(stats2);

    return NextResponse.json({
      success: true,
      message: 'Demo dataset successfully seeded into Sibyl Memory.',
      seeded: {
        counterparties: [stats, stats2],
        commitments: [seedCommitment, comm2],
        outcomes: [seedOutcome, outcome2],
      },
    });
  } catch (error: any) {
    console.error('Error resetting demo data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset demo dataset' },
      { status: 500 }
    );
  }
}
