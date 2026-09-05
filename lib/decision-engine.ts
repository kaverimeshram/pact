import {
  Commitment,
  Decision,
  Outcome,
  RiskLevel
} from './types';
import {
  listCommitments,
  listOutcomes,
  recallCounterparty,
  recallRelevantHistory,
  recordSibylEvent
} from './memory/sibyl';
import {
  calculatePaymentStrategy,
  calculateReliability,
  calculateRisk
} from './reputation';

export interface EvaluateTaskInput {
  task: string;
  budget: number;
  candidateName: string;
  candidateId?: string;
  simulateNoMemory?: boolean;
  sessionId: string;
}

/**
 * Evaluate a counterparty and generate a deterministic risk & payment decision.
 * If simulateNoMemory is true, bypasses Sibyl recall to simulate a cold start.
 */
export async function evaluateCounterpartyDecision(
  input: EvaluateTaskInput
): Promise<Decision> {
  const {
    task,
    budget,
    candidateName,
    candidateId = `agent-${candidateName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    simulateNoMemory = false,
    sessionId,
  } = input;

  const now = new Date().toISOString();

  // 1. If Memory is simulated OFF / cold start requested
  if (simulateNoMemory) {
    const coldStartScore = 50;
    const coldRisk: RiskLevel = 'UNKNOWN';
    const coldStrategy = calculatePaymentStrategy(coldRisk, budget);

    const decision: Decision = {
      selectedCounterparty: candidateName,
      counterpartyId: candidateId,
      task,
      budget,
      reliabilityScore: coldStartScore,
      riskLevel: coldRisk,
      paymentStrategy: coldStrategy.strategy,
      milestoneCount: coldStrategy.milestoneCount,
      milestones: coldStrategy.milestones,
      reasoning:
        'NO REPUTATION HISTORY: Memory recall disabled / Cold start mode. Agent has no persistent record of counterparty past behavior. Applying default unverified counterparty terms.',
      memoryEvidence: {
        hasHistory: false,
        commitmentsCount: 0,
        outcomesCount: 0,
        journalEventsCount: 0,
        snippets: [],
      },
      isColdStart: true,
      memorySimulatedOff: true,
      evaluatedAt: now,
      sessionId,
    };

    return decision;
  }

  // 2. Real Sibyl Memory Recall: Query persistent store
  let counterpartyEntity = await recallCounterparty(candidateName);
  const allCommitments = await listCommitments();
  const allOutcomes = await listOutcomes();
  const searchResults = await recallRelevantHistory(candidateName);

  // Filter for this specific counterparty
  const counterpartyCommitments = allCommitments.filter(
    (c) =>
      c.counterpartyName?.toLowerCase() === candidateName.toLowerCase() ||
      c.counterpartyId === candidateId
  );

  const counterpartyOutcomes = allOutcomes.filter(
    (o) =>
      o.counterpartyName?.toLowerCase() === candidateName.toLowerCase() ||
      o.counterpartyId === candidateId ||
      counterpartyCommitments.some((c) => c.id === o.commitmentId)
  );

  const hasHistory = counterpartyOutcomes.length > 0 || counterpartyCommitments.length > 0;

  // 3. Compute Deterministic Reputation
  const reliabilityScore = calculateReliability({
    commitments: counterpartyCommitments,
    outcomes: counterpartyOutcomes,
  });

  const riskLevel = calculateRisk(reliabilityScore, counterpartyOutcomes.length);
  const strategyResult = calculatePaymentStrategy(riskLevel, budget);

  // 4. Extract Memory Evidence & Formulate Reasoning
  let reasoning = '';
  const latestOutcome =
    counterpartyOutcomes.length > 0
      ? counterpartyOutcomes[counterpartyOutcomes.length - 1]
      : null;

  if (!hasHistory) {
    reasoning =
      'Cold start: Counterparty has no recorded commitments or outcomes in Sibyl Memory. Defaulting to standard baseline reliability.';
  } else if (latestOutcome) {
    const delayText =
      latestOutcome.delayHours > 0
        ? `Previous delivery was ${latestOutcome.delayHours} hours late`
        : 'Previous delivery was on-time';
    const qualityText = `received a ${latestOutcome.qualityScore}/10 quality score`;
    const notesText = latestOutcome.notes ? ` (${latestOutcome.notes})` : '';

    if (riskLevel === 'HIGH') {
      reasoning = `${delayText} and ${qualityText}${notesText}. Recalled history reduced reliability to ${reliabilityScore}/100 (HIGH RISK). PACT enforces 3 milestone payments with no full upfront disbursement.`;
    } else if (riskLevel === 'CRITICAL') {
      reasoning = `Counterparty previously defaulted or severely breached commitments (${notesText}). Reliability is critical (${reliabilityScore}/100). Enforcing 0% upfront escrow.`;
    } else if (riskLevel === 'LOW') {
      reasoning = `Counterparty maintained outstanding delivery timeliness and quality. Reliability is high (${reliabilityScore}/100). Approving full upfront terms.`;
    } else {
      reasoning = `${delayText} with ${qualityText}. Reliability evaluated at ${reliabilityScore}/100 (MODERATE RISK). Recommending 50/50 milestone split.`;
    }
  } else {
    reasoning = `Recalled ${counterpartyCommitments.length} pending commitment(s) from Sibyl Memory. Reliability baseline at ${reliabilityScore}/100.`;
  }

  const decision: Decision = {
    selectedCounterparty: candidateName,
    counterpartyId: candidateId,
    task,
    budget,
    reliabilityScore,
    riskLevel,
    paymentStrategy: strategyResult.strategy,
    milestoneCount: strategyResult.milestoneCount,
    milestones: strategyResult.milestones,
    reasoning,
    memoryEvidence: {
      hasHistory,
      commitmentsCount: counterpartyCommitments.length,
      outcomesCount: counterpartyOutcomes.length,
      lastDelayHours: latestOutcome?.delayHours,
      lastQualityScore: latestOutcome?.qualityScore,
      lastNotes: latestOutcome?.notes,
      journalEventsCount: searchResults.hits.length,
      snippets: searchResults.hits.map((h) => h.snippet).slice(0, 4),
    },
    isColdStart: !hasHistory,
    memorySimulatedOff: false,
    evaluatedAt: now,
    sessionId,
  };

  // Record this evaluation event into Sibyl COLD-tier journal
  try {
    await recordSibylEvent({
      evaluated: {
        task,
        budget,
        candidate: candidateName,
        sessionId,
        reliabilityScore,
        riskLevel,
      },
      acted: {
        action: 'DECISION_GENERATED',
        strategy: strategyResult.strategy,
        milestoneCount: strategyResult.milestoneCount,
      },
      forward: {
        enforceTerms: strategyResult.summary,
      },
      extra: {
        category: 'decisions',
        name: `${candidateName}-${sessionId}`,
        sessionId,
      },
    });
  } catch (err) {
    console.error('Failed to log decision to Sibyl journal:', err);
  }

  return decision;
}
