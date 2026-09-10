import { NextResponse } from 'next/server';
import { runPactAgentWorkflow, DEFAULT_CANDIDATE_PROFILES } from '@/lib/pact-agent';

export async function GET() {
  return NextResponse.json({
    success: true,
    agent: 'PACT Autonomous Counterparty & Escrow Agent',
    version: '1.0.0',
    candidates: DEFAULT_CANDIDATE_PROFILES,
    presets: [
      {
        task: 'Produce a market research report',
        budget: 60,
        deadlineHours: 24,
        description: 'Standard market report scenario ($60 budget, prefers Agent B over A due to memory history)',
      },
      {
        task: 'Quick competitor scan and pricing summary',
        budget: 45,
        deadlineHours: 12,
        description: 'Budget-constrained task ($45 budget forces Agent A with strict 3-stage milestone escrow)',
      },
      {
        task: 'Comprehensive multi-sector strategic market due diligence',
        budget: 95,
        deadlineHours: 48,
        description: 'High-budget enterprise report ($95 budget enables top-tier Agent C with 94/100 reputation)',
      },
    ],
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      task,
      budget,
      deadlineHours = 24,
      candidatePool,
      simulateNoMemory = false,
      sessionId,
    } = body;

    if (!task || budget === undefined || budget === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: task and budget are required.',
        },
        { status: 400 }
      );
    }

    const decision = await runPactAgentWorkflow({
      task: String(task).trim(),
      budget: Number(budget),
      deadlineHours: Number(deadlineHours) || 24,
      candidatePool: Array.isArray(candidatePool) ? candidatePool : undefined,
      simulateNoMemory: Boolean(simulateNoMemory),
      sessionId: sessionId ? String(sessionId) : undefined,
    });

    return NextResponse.json({
      success: true,
      decision,
    });
  } catch (error: any) {
    console.error('Error in PACT Agent API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to execute PACT agent workflow',
      },
      { status: 500 }
    );
  }
}
