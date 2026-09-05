import { NextResponse } from 'next/server';
import {
  listCommitments,
  listOutcomes,
  persistCommitment,
  persistOutcome,
  recallCounterparty,
  persistCounterparty,
} from '@/lib/memory/sibyl';
import { aggregateCounterpartyStats } from '@/lib/reputation';
import { Outcome } from '@/lib/types';

export async function GET() {
  try {
    const outcomes = await listOutcomes();
    return NextResponse.json({ success: true, outcomes });
  } catch (error: any) {
    console.error('Error fetching outcomes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list outcomes' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      commitmentId,
      counterpartyId,
      counterpartyName,
      actualDeliveryHours,
      delayHours,
      qualityScore,
      success = true,
      disputed = false,
      notes = '',
      txHash,
    } = body;

    if (!commitmentId) {
      return NextResponse.json(
        { success: false, error: 'commitmentId is required' },
        { status: 400 }
      );
    }

    // Retrieve commitment to get details if not provided
    const commitments = await listCommitments();
    const commitment = commitments.find((c) => c.id === commitmentId);

    const resolvedCpName = counterpartyName || commitment?.counterpartyName || 'Unknown Counterparty';
    const resolvedCpId =
      counterpartyId ||
      commitment?.counterpartyId ||
      `agent-${resolvedCpName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const expectedHours = commitment?.expectedDeadlineHours || 24;
    const actualHours = Number(actualDeliveryHours ?? 24);
    const calculatedDelay =
      delayHours !== undefined ? Number(delayHours) : Math.max(0, actualHours - expectedHours);

    const newOutcome: Outcome = {
      commitmentId,
      counterpartyId: resolvedCpId,
      counterpartyName: resolvedCpName,
      actualDeliveryHours: actualHours,
      delayHours: calculatedDelay,
      qualityScore: Number(qualityScore ?? 8),
      success: Boolean(success),
      disputed: Boolean(disputed),
      notes: notes || (calculatedDelay > 0 ? `Delivered ${calculatedDelay}h late` : 'On-time delivery'),
      recordedAt: new Date().toISOString(),
      txHash,
    };

    // 1. Persist outcome to Sibyl Memory
    await persistOutcome(newOutcome);

    // 2. Update commitment status to COMPLETED if it exists
    if (commitment) {
      commitment.status = success ? 'COMPLETED' : 'FAILED';
      await persistCommitment(commitment);
    }

    // 3. Re-aggregate counterparty metrics and update counterparty in Sibyl
    const allCommitments = await listCommitments();
    const allOutcomes = await listOutcomes();

    const matchingCommitments = allCommitments.filter(
      (c) => c.counterpartyName?.toLowerCase() === resolvedCpName.toLowerCase()
    );
    const matchingOutcomes = allOutcomes.filter(
      (o) =>
        o.counterpartyName?.toLowerCase() === resolvedCpName.toLowerCase() ||
        matchingCommitments.some((c) => c.id === o.commitmentId)
    );

    const updatedStats = aggregateCounterpartyStats(
      resolvedCpId,
      resolvedCpName,
      'Research & Task Specialist',
      matchingOutcomes,
      matchingCommitments
    );

    await persistCounterparty(updatedStats);

    return NextResponse.json({
      success: true,
      outcome: newOutcome,
      updatedCounterparty: updatedStats,
    });
  } catch (error: any) {
    console.error('Error creating outcome:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record outcome' },
      { status: 500 }
    );
  }
}
