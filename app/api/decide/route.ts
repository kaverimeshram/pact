import { NextResponse } from 'next/server';
import { evaluateCounterpartyDecision } from '@/lib/decision-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      task,
      budget,
      candidateName,
      candidateId,
      simulateNoMemory = false,
      sessionId = `session-${Date.now().toString(36)}`,
    } = body;

    if (!task || !budget || !candidateName) {
      return NextResponse.json(
        {
          success: false,
          error: 'task, budget, and candidateName are required for evaluation',
        },
        { status: 400 }
      );
    }

    const decision = await evaluateCounterpartyDecision({
      task,
      budget: Number(budget),
      candidateName,
      candidateId,
      simulateNoMemory: Boolean(simulateNoMemory),
      sessionId,
    });

    return NextResponse.json({ success: true, decision });
  } catch (error: any) {
    console.error('Error evaluating decision:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to evaluate decision' },
      { status: 500 }
    );
  }
}
