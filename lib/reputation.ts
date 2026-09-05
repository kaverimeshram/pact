import {
  Commitment,
  Counterparty,
  Milestone,
  Outcome,
  PaymentStrategyType,
  RiskLevel
} from './types';

export interface CounterpartyHistory {
  counterpartyId: string;
  counterpartyName: string;
  commitments: Commitment[];
  outcomes: Outcome[];
}

/**
 * Calculate deterministic reliability score (0-100) from historical outcomes.
 * Default baseline for brand new counterparty is 50.
 */
export function calculateReliability(
  history: { commitments?: Commitment[]; outcomes?: Outcome[] } | null | undefined
): number {
  const BASE_SCORE = 50;

  if (!history || !history.outcomes || history.outcomes.length === 0) {
    return BASE_SCORE;
  }

  let currentScore = BASE_SCORE;

  for (const outcome of history.outcomes) {
    if (!outcome.success) {
      // Severe penalty for complete failure
      currentScore -= 25;
      continue;
    }

    if (outcome.disputed) {
      currentScore -= 15;
    }

    // Delay penalty: 0.5 points per hour of delay
    if (outcome.delayHours > 0) {
      const delayPenalty = outcome.delayHours * 0.5;
      currentScore -= delayPenalty;
    } else {
      // Bonus for on-time delivery
      currentScore += 4;
    }

    // Quality modifier (relative to baseline 8/10)
    // 10/10 -> +2, 8/10 -> 0, 6/10 -> -1, 4/10 -> -3, 2/10 -> -5
    const qualityDelta = (outcome.qualityScore - 8) * 0.5;
    currentScore += qualityDelta;
  }

  // Bound score between 1 and 100
  const finalScore = Math.max(1, Math.min(100, Math.round(currentScore)));
  return finalScore;
}

/**
 * Determine risk level from reliability score and history completeness
 */
export function calculateRisk(
  reliabilityScore: number,
  historyCount: number
): RiskLevel {
  if (historyCount === 0) {
    return 'UNKNOWN';
  }

  if (reliabilityScore < 30) {
    return 'CRITICAL';
  }
  if (reliabilityScore <= 45) {
    return 'HIGH';
  }
  if (reliabilityScore < 70) {
    return 'MODERATE';
  }
  return 'LOW';
}

/**
 * Compute milestone structure and payment terms based on risk and task budget
 */
export function calculatePaymentStrategy(
  riskLevel: RiskLevel,
  budget: number
): {
  strategy: PaymentStrategyType;
  milestoneCount: number;
  milestones: Milestone[];
  summary: string;
} {
  const roundedBudget = Math.round(budget * 100) / 100;

  switch (riskLevel) {
    case 'LOW': {
      // 100% upfront for proven trusted agents
      return {
        strategy: 'FULL_UPFRONT',
        milestoneCount: 1,
        milestones: [
          {
            id: 'm-1',
            name: 'Full Upfront Disbursement',
            percentage: 100,
            amount: roundedBudget,
            condition: 'Immediate disbursement upon contract signing',
            status: 'PENDING',
          },
        ],
        summary: 'Full 100% upfront payment approved due to high historical reliability.',
      };
    }

    case 'MODERATE': {
      // 50% upfront, 50% on completion
      const upfront = Math.round(roundedBudget * 0.5 * 100) / 100;
      const completion = Math.round((roundedBudget - upfront) * 100) / 100;
      return {
        strategy: 'SPLIT_50_50',
        milestoneCount: 2,
        milestones: [
          {
            id: 'm-1',
            name: 'Initial Deposit (50%)',
            percentage: 50,
            amount: upfront,
            condition: 'Disbursed upon task commencement',
            status: 'PENDING',
          },
          {
            id: 'm-2',
            name: 'Final Completion (50%)',
            percentage: 50,
            amount: completion,
            condition: 'Released upon delivery and quality verification',
            status: 'PENDING',
          },
        ],
        summary: 'Split 50/50 payment structure to balance risk and counterparty liquidity.',
      };
    }

    case 'HIGH': {
      // 3 Milestones: 20% upfront, 40% intermediate, 40% final verification
      // For $50: $10 upfront, $20 milestone 1, $20 final verification
      const upfront = Math.round(roundedBudget * 0.2 * 100) / 100;
      const milestone1 = Math.round(roundedBudget * 0.4 * 100) / 100;
      const milestone2 = Math.round((roundedBudget - upfront - milestone1) * 100) / 100;

      return {
        strategy: 'MILESTONE_3',
        milestoneCount: 3,
        milestones: [
          {
            id: 'm-1',
            name: 'Upfront Mobilization (20%)',
            percentage: 20,
            amount: upfront,
            condition: 'Disbursed to start work ($10 for $50 task)',
            status: 'PENDING',
          },
          {
            id: 'm-2',
            name: 'Progress Checkpoint (40%)',
            percentage: 40,
            amount: milestone1,
            condition: 'Released after first milestone deliverable review',
            status: 'PENDING',
          },
          {
            id: 'm-3',
            name: 'Final Verification (40%)',
            percentage: 40,
            amount: milestone2,
            condition: 'Released strictly after full quality & timeliness audit',
            status: 'PENDING',
          },
        ],
        summary:
          '3-stage milestone escrow enforced due to previous delivery delays or quality deficiencies. Full upfront payment denied.',
      };
    }

    case 'CRITICAL': {
      // 0% upfront, 50% mid-point deliverable, 50% final verification
      const mid = Math.round(roundedBudget * 0.5 * 100) / 100;
      const final = Math.round((roundedBudget - mid) * 100) / 100;

      return {
        strategy: 'STRICT_ESCROW_NO_UPFRONT',
        milestoneCount: 2,
        milestones: [
          {
            id: 'm-1',
            name: 'Mid-Point Deliverable (50%)',
            percentage: 50,
            amount: mid,
            condition: '0% upfront. Released only upon working proof-of-work',
            status: 'PENDING',
          },
          {
            id: 'm-2',
            name: 'Full Verification (50%)',
            percentage: 50,
            amount: final,
            condition: 'Released upon final acceptance and dispute window close',
            status: 'PENDING',
          },
        ],
        summary:
          'Strict escrow with 0% upfront payment due to severe past defaults or broken commitments.',
      };
    }

    case 'UNKNOWN':
    default: {
      // Standard cold-start policy: 30% upfront, 70% upon delivery
      const upfront = Math.round(roundedBudget * 0.3 * 100) / 100;
      const final = Math.round((roundedBudget - upfront) * 100) / 100;

      return {
        strategy: 'STANDARD_COLD_START',
        milestoneCount: 2,
        milestones: [
          {
            id: 'm-1',
            name: 'Initial Commitment (30%)',
            percentage: 30,
            amount: upfront,
            condition: 'Initial deposit for unverified counterparty',
            status: 'PENDING',
          },
          {
            id: 'm-2',
            name: 'Delivery Settlement (70%)',
            percentage: 70,
            amount: final,
            condition: 'Disbursed upon verified task completion',
            status: 'PENDING',
          },
        ],
        summary:
          'Standard cold-start terms for counterparty with no prior persistent history.',
      };
    }
  }
}

/**
 * Summarize counterparty aggregate metrics from raw outcomes
 */
export function aggregateCounterpartyStats(
  counterpartyId: string,
  name: string,
  capability: string,
  outcomes: Outcome[],
  commitments: Commitment[]
): Counterparty {
  const reliabilityScore = calculateReliability({ outcomes, commitments });
  const riskLevel = calculateRisk(reliabilityScore, outcomes.length);

  const successfulCount = outcomes.filter((o) => o.success).length;
  const failedCount = outcomes.filter((o) => !o.success).length;
  const lateCount = outcomes.filter((o) => o.delayHours > 0).length;

  const totalDelay = outcomes.reduce((acc, o) => acc + (o.delayHours || 0), 0);
  const avgDelay = outcomes.length > 0 ? Math.round((totalDelay / outcomes.length) * 10) / 10 : 0;

  const totalQuality = outcomes.reduce((acc, o) => acc + (o.qualityScore || 0), 0);
  const avgQuality = outcomes.length > 0 ? Math.round((totalQuality / outcomes.length) * 10) / 10 : 0;

  const lastInteraction = outcomes.length > 0 ? outcomes[outcomes.length - 1].recordedAt : undefined;

  return {
    id: counterpartyId,
    name,
    capability,
    reliabilityScore,
    riskLevel,
    commitments: commitments.length,
    successfulCommitments: successfulCount,
    failedCommitments: failedCount,
    lateCommitments: lateCount,
    averageDelay: avgDelay,
    averageQuality: avgQuality,
    lastInteraction,
    isColdStart: outcomes.length === 0,
  };
}
