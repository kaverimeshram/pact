import { NextResponse } from 'next/server';
import { listCommitments, persistCommitment, recallCounterparty, persistCounterparty } from '@/lib/memory/sibyl';
import { Commitment } from '@/lib/types';

export async function GET() {
  try {
    const commitments = await listCommitments();
    return NextResponse.json({ success: true, commitments });
  } catch (error: any) {
    console.error('Error fetching commitments:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list commitments' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id = `comm-${Date.now().toString().slice(-6)}`,
      counterpartyName,
      counterpartyId,
      task,
      budget,
      expectedDeadlineHours = 24,
      expectedQuality = 8,
      status = 'ACTIVE',
      paymentStrategy,
      milestones,
      txHash,
    } = body;

    if (!counterpartyName || !task || !budget) {
      return NextResponse.json(
        { success: false, error: 'counterpartyName, task, and budget are required' },
        { status: 400 }
      );
    }

    const resolvedCpId =
      counterpartyId || `agent-${counterpartyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const newCommitment: Commitment = {
      id,
      counterpartyId: resolvedCpId,
      counterpartyName,
      task,
      budget: Number(budget),
      expectedDeadlineHours: Number(expectedDeadlineHours),
      expectedQuality: Number(expectedQuality),
      createdAt: new Date().toISOString(),
      status,
      paymentStrategy,
      milestones,
      txHash,
    };

    await persistCommitment(newCommitment);

    // Check if counterparty is registered in Sibyl, if not register
    const existing = await recallCounterparty(counterpartyName);
    if (!existing) {
      await persistCounterparty({
        id: resolvedCpId,
        name: counterpartyName,
        capability: 'Task Specialist',
        reliabilityScore: 50,
        riskLevel: 'UNKNOWN',
        commitments: 1,
        successfulCommitments: 0,
        failedCommitments: 0,
        lateCommitments: 0,
        averageDelay: 0,
        averageQuality: 0,
        isColdStart: true,
      });
    }

    return NextResponse.json({ success: true, commitment: newCommitment });
  } catch (error: any) {
    console.error('Error creating commitment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create commitment' },
      { status: 500 }
    );
  }
}
