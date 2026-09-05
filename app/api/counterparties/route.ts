import { NextResponse } from 'next/server';
import {
  listCounterparties,
  listCommitments,
  listOutcomes,
  persistCounterparty,
} from '@/lib/memory/sibyl';
import { aggregateCounterpartyStats } from '@/lib/reputation';
import { Counterparty } from '@/lib/types';

export async function GET() {
  try {
    const rawCounterparties = await listCounterparties();
    const commitments = await listCommitments();
    const outcomes = await listOutcomes();

    // Group and aggregate metrics
    const counterpartyMap = new Map<string, Counterparty>();

    // Seed defaults if registered
    for (const cp of rawCounterparties) {
      counterpartyMap.set(cp.name.toLowerCase(), cp);
    }

    // Collect all counterparty names mentioned in commitments or outcomes
    const names = new Set<string>();
    rawCounterparties.forEach((c) => names.add(c.name));
    commitments.forEach((c) => names.add(c.counterpartyName));
    outcomes.forEach((o) => o.counterpartyName && names.add(o.counterpartyName));

    const aggregatedList: Counterparty[] = [];

    for (const name of Array.from(names)) {
      const matchingCommitments = commitments.filter(
        (c) => c.counterpartyName?.toLowerCase() === name.toLowerCase()
      );
      const matchingOutcomes = outcomes.filter(
        (o) =>
          o.counterpartyName?.toLowerCase() === name.toLowerCase() ||
          matchingCommitments.some((c) => c.id === o.commitmentId)
      );

      const existing = counterpartyMap.get(name.toLowerCase());
      const capability = existing?.capability || 'General AI Task Agent';
      const id = existing?.id || `agent-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      const aggregated = aggregateCounterpartyStats(
        id,
        name,
        capability,
        matchingOutcomes,
        matchingCommitments
      );

      aggregatedList.push(aggregated);
    }

    return NextResponse.json({ success: true, counterparties: aggregatedList });
  } catch (error: any) {
    console.error('Error fetching counterparties:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list counterparties' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, capability = 'AI Agent' } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Counterparty name is required' },
        { status: 400 }
      );
    }

    const id = `agent-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const newCounterparty: Counterparty = {
      id,
      name,
      capability,
      reliabilityScore: 50,
      riskLevel: 'UNKNOWN',
      commitments: 0,
      successfulCommitments: 0,
      failedCommitments: 0,
      lateCommitments: 0,
      averageDelay: 0,
      averageQuality: 0,
      isColdStart: true,
    };

    await persistCounterparty(newCounterparty);

    return NextResponse.json({ success: true, counterparty: newCounterparty });
  } catch (error: any) {
    console.error('Error creating counterparty:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create counterparty' },
      { status: 500 }
    );
  }
}
