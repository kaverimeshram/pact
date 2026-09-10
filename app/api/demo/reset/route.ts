import { NextResponse } from 'next/server';
import {
  clearMemoryStore,
  persistCommitment,
  persistCounterparty,
  persistOutcome,
} from '@/lib/memory/sibyl';
import { aggregateCounterpartyStats } from '@/lib/reputation';
import { Commitment, Outcome } from '@/lib/types';

/**
 * Reusable helper to seed complete PACT demo and agent counterparties into Sibyl Memory
 */
export async function seedDemoDataset(clearFirst: boolean = true) {
  if (clearFirst) {
    await clearMemoryStore();
  }

  // ----------------------------------------------------------------
  // 1. ResearchAgent-A (HIGH RISK, ~42 Reliability)
  // 1 commitment, delivered 14 hours late, quality 6/10
  // ----------------------------------------------------------------
  const cpAId = 'agent-researchagent-a';
  const cpAName = 'ResearchAgent-A';
  const commA1: Commitment = {
    id: 'comm-demo-a01',
    counterpartyId: cpAId,
    counterpartyName: cpAName,
    task: 'Initial Market Research & Competitor Landscape Analysis',
    budget: 50,
    expectedDeadlineHours: 24,
    expectedQuality: 8,
    createdAt: '2026-09-01T08:00:00Z',
    status: 'COMPLETED',
    paymentStrategy: 'STANDARD_COLD_START',
  };

  const outcomeA1: Outcome = {
    commitmentId: 'comm-demo-a01',
    counterpartyId: cpAId,
    counterpartyName: cpAName,
    actualDeliveryHours: 38,
    delayHours: 14,
    qualityScore: 6,
    success: true,
    disputed: false,
    notes: 'Delivered 14 hours late with 6/10 quality score (expected 8/10)',
    recordedAt: '2026-09-02T22:00:00Z',
  };

  await persistCommitment(commA1);
  await persistOutcome(outcomeA1);

  const statsA = aggregateCounterpartyStats(
    cpAId,
    cpAName,
    'Market & Quantitative Research Specialist',
    [outcomeA1],
    [commA1]
  );
  await persistCounterparty(statsA);

  // ----------------------------------------------------------------
  // 2. ResearchAgent-B (LOW RISK, ~76 Reliability)
  // 8 commitments, 7 on-time (quality 9/10), 1 late (10h delay, quality 8/10)
  // ----------------------------------------------------------------
  const cpBId = 'agent-researchagent-b';
  const cpBName = 'ResearchAgent-B';
  const commitmentsB: Commitment[] = [];
  const outcomesB: Outcome[] = [];

  for (let i = 1; i <= 6; i++) {
    const id = `comm-demo-b0${i}`;
    const comm: Commitment = {
      id,
      counterpartyId: cpBId,
      counterpartyName: cpBName,
      task: `Market Sector Analysis Part ${i}`,
      budget: 55,
      expectedDeadlineHours: 24,
      expectedQuality: 8,
      createdAt: `2026-08-${10 + i}T10:00:00Z`,
      status: 'COMPLETED',
      paymentStrategy: 'FULL_UPFRONT',
    };
    const out: Outcome = {
      commitmentId: id,
      counterpartyId: cpBId,
      counterpartyName: cpBName,
      actualDeliveryHours: 24,
      delayHours: 0,
      qualityScore: 9,
      success: true,
      disputed: false,
      notes: `Prompt on-time delivery with comprehensive quantitative data (Part ${i})`,
      recordedAt: `2026-08-${11 + i}T10:00:00Z`,
    };
    commitmentsB.push(comm);
    outcomesB.push(out);
    await persistCommitment(comm);
    await persistOutcome(out);
  }

  // 7th: early on-time
  const commB7: Commitment = {
    id: 'comm-demo-b07',
    counterpartyId: cpBId,
    counterpartyName: cpBName,
    task: 'Fintech Competitive Benchmarking',
    budget: 55,
    expectedDeadlineHours: 20,
    expectedQuality: 8,
    createdAt: '2026-08-20T09:00:00Z',
    status: 'COMPLETED',
    paymentStrategy: 'FULL_UPFRONT',
  };
  const outB7: Outcome = {
    commitmentId: 'comm-demo-b07',
    counterpartyId: cpBId,
    counterpartyName: cpBName,
    actualDeliveryHours: 18,
    delayHours: 0,
    qualityScore: 8,
    success: true,
    disputed: false,
    notes: 'Delivered 2h ahead of deadline with solid accuracy',
    recordedAt: '2026-08-21T03:00:00Z',
  };
  commitmentsB.push(commB7);
  outcomesB.push(outB7);
  await persistCommitment(commB7);
  await persistOutcome(outB7);

  // 8th: 1 late outcome (10h delay)
  const commB8: Commitment = {
    id: 'comm-demo-b08',
    counterpartyId: cpBId,
    counterpartyName: cpBName,
    task: 'Macro Economic Indicator Synthesis',
    budget: 55,
    expectedDeadlineHours: 24,
    expectedQuality: 8,
    createdAt: '2026-08-25T12:00:00Z',
    status: 'COMPLETED',
    paymentStrategy: 'FULL_UPFRONT',
  };
  const outB8: Outcome = {
    commitmentId: 'comm-demo-b08',
    counterpartyId: cpBId,
    counterpartyName: cpBName,
    actualDeliveryHours: 34,
    delayHours: 10,
    qualityScore: 8,
    success: true,
    disputed: false,
    notes: 'Minor delay due to API upstream downtime; quality was high 8/10',
    recordedAt: '2026-08-26T22:00:00Z',
  };
  commitmentsB.push(commB8);
  outcomesB.push(outB8);
  await persistCommitment(commB8);
  await persistOutcome(outB8);

  const statsB = aggregateCounterpartyStats(
    cpBId,
    cpBName,
    'Market Research & Industry Intelligence Agent',
    outcomesB,
    commitmentsB
  );
  await persistCounterparty(statsB);

  // ----------------------------------------------------------------
  // 3. ResearchAgent-C (LOW RISK, ~94 Reliability, Premium Pricing)
  // 10 commitments, 10 on-time (8 quality 9/10, 2 quality 8/10)
  // ----------------------------------------------------------------
  const cpCId = 'agent-researchagent-c';
  const cpCName = 'ResearchAgent-C';
  const commitmentsC: Commitment[] = [];
  const outcomesC: Outcome[] = [];

  for (let i = 1; i <= 10; i++) {
    const id = `comm-demo-c${i < 10 ? '0' + i : i}`;
    const comm: Commitment = {
      id,
      counterpartyId: cpCId,
      counterpartyName: cpCName,
      task: `Enterprise Market Dossier #${i}`,
      budget: 85,
      expectedDeadlineHours: 24,
      expectedQuality: 9,
      createdAt: `2026-07-${10 + i}T08:00:00Z`,
      status: 'COMPLETED',
      paymentStrategy: 'FULL_UPFRONT',
    };
    const out: Outcome = {
      commitmentId: id,
      counterpartyId: cpCId,
      counterpartyName: cpCName,
      actualDeliveryHours: 22,
      delayHours: 0,
      qualityScore: i <= 8 ? 9 : 8,
      success: true,
      disputed: false,
      notes: `Flawless execution of strategic research dossier #${i}`,
      recordedAt: `2026-07-${11 + i}T06:00:00Z`,
    };
    commitmentsC.push(comm);
    outcomesC.push(out);
    await persistCommitment(comm);
    await persistOutcome(out);
  }

  const statsC = aggregateCounterpartyStats(
    cpCId,
    cpCName,
    'Senior Strategic Market & Due Diligence Specialist',
    outcomesC,
    commitmentsC
  );
  await persistCounterparty(statsC);

  // ----------------------------------------------------------------
  // 4. CodeAuditAgent-X (LOW/MODERATE RISK, Reliability 72)
  // ----------------------------------------------------------------
  const commX: Commitment = {
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

  const outcomeX: Outcome = {
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

  await persistCommitment(commX);
  await persistOutcome(outcomeX);

  const statsX = aggregateCounterpartyStats(
    'agent-codeauditagent-x',
    'CodeAuditAgent-X',
    'Smart Contract Security & Static Analysis',
    [outcomeX],
    [commX]
  );
  await persistCounterparty(statsX);

  return {
    counterparties: [statsA, statsB, statsC, statsX],
    commitments: [commA1, ...commitmentsB, ...commitmentsC, commX],
    outcomes: [outcomeA1, ...outcomesB, ...outcomesC, outcomeX],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = 'seed' } = body;

    if (action === 'clear') {
      await clearMemoryStore();
      return NextResponse.json({
        success: true,
        message: 'Sibyl Memory store cleared completely.',
      });
    }

    const seeded = await seedDemoDataset(true);

    return NextResponse.json({
      success: true,
      message: 'Demo dataset successfully seeded into Sibyl Memory.',
      seeded,
    });
  } catch (error: any) {
    console.error('Error resetting demo data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset demo dataset' },
      { status: 500 }
    );
  }
}
