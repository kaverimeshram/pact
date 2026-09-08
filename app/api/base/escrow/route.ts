import { NextResponse } from 'next/server';
import { executeBaseEscrowCommitment } from '@/lib/base';
import { listCommitments, persistCommitment } from '@/lib/memory/sibyl';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { commitmentId, counterpartyName, budget, strategy, milestones } = body;

    if (!commitmentId || !counterpartyName) {
      return NextResponse.json(
        { success: false, error: 'commitmentId and counterpartyName are required' },
        { status: 400 }
      );
    }

    const result = await executeBaseEscrowCommitment({
      commitmentId,
      counterpartyName,
      budgetEthOrUsd: Number(budget || 50),
      strategy: strategy || 'MILESTONE_3',
      milestones,
    });

    if (result.txHash) {
      // Update commitment in Sibyl with txHash
      const commitments = await listCommitments();
      const commitment = commitments.find((c) => c.id === commitmentId);
      if (commitment) {
        commitment.txHash = result.txHash;
        await persistCommitment(commitment);
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process Base escrow' },
      { status: 500 }
    );
  }
}
