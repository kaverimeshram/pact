import {
  CandidateEvaluation,
  CandidateProfile,
  Commitment,
  Milestone,
  Outcome,
  PactAgentDecision,
  PactAgentInput,
  PreparedEscrowAction,
  RiskLevel,
} from './types';
import {
  listCommitments,
  listCounterparties,
  listOutcomes,
  persistCommitment,
  recallRelevantHistory,
  recordSibylEvent,
} from './memory/sibyl';
import {
  aggregateCounterpartyStats,
  calculatePaymentStrategy,
  calculateReliability,
  calculateRisk,
} from './reputation';
import {
  DEMO_AGENT_WALLETS,
  formatBaseScanTxUrl,
  getEscrowContractAddress,
} from './contracts/pactEscrow';
import { seedDemoDataset } from '@/app/api/demo/reset/route';

/**
 * Standard candidate profiles with default rates and capabilities
 */
export const DEFAULT_CANDIDATE_PROFILES: CandidateProfile[] = [
  {
    name: 'ResearchAgent-A',
    capability: 'Market & Quantitative Research Specialist',
    basePrice: 40,
    walletAddress: DEMO_AGENT_WALLETS['ResearchAgent-A'] || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  },
  {
    name: 'ResearchAgent-B',
    capability: 'Market Research & Industry Intelligence Agent',
    basePrice: 55,
    walletAddress: DEMO_AGENT_WALLETS['ResearchAgent-B'] || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  },
  {
    name: 'ResearchAgent-C',
    capability: 'Senior Strategic Market & Due Diligence Specialist',
    basePrice: 85,
    walletAddress: DEMO_AGENT_WALLETS['ResearchAgent-C'] || '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  },
];

/**
 * Ensures baseline demo counterparties are populated in Sibyl Memory if database is empty
 */
export async function ensureAgentCandidateSeedData(): Promise<void> {
  const existingOutcomes = await listOutcomes();
  if (existingOutcomes.length === 0) {
    await seedDemoDataset(false);
  }
}

/**
 * Main PACT Agent Workflow:
 * User Request -> Understand Task -> Query Sibyl Memory -> Deterministic Evaluation ->
 * Candidate Selection -> Risk-Adjusted Payment Terms -> Commitment Creation -> Escrow Preparation
 */
export async function runPactAgentWorkflow(input: PactAgentInput): Promise<PactAgentDecision> {
  const {
    task,
    budget,
    deadlineHours = 24,
    candidatePool,
    simulateNoMemory = false,
    sessionId = `agent-sess-${Date.now().toString(36)}`,
  } = input;

  const evaluatedAt = new Date().toISOString();

  // 1. Resolve candidates to evaluate
  const candidateNames =
    candidatePool && candidatePool.length > 0
      ? candidatePool
      : DEFAULT_CANDIDATE_PROFILES.map((c) => c.name);

  // 2. Fetch memory data from Sibyl (unless simulating no memory)
  let allCommitments: Commitment[] = [];
  let allOutcomes: Outcome[] = [];

  if (!simulateNoMemory) {
    await ensureAgentCandidateSeedData();
    allCommitments = await listCommitments();
    allOutcomes = await listOutcomes();
  }

  // 3. Evaluate each candidate
  const candidateEvaluations: CandidateEvaluation[] = [];

  for (const candidateName of candidateNames) {
    const profile =
      DEFAULT_CANDIDATE_PROFILES.find((p) => p.name.toLowerCase() === candidateName.toLowerCase()) || {
        name: candidateName,
        capability: 'Autonomous Task Counterparty',
        basePrice: 50,
        walletAddress: DEMO_AGENT_WALLETS['ResearchAgent-A'],
      };

    const price = profile.basePrice;
    const withinBudget = price <= budget;

    if (simulateNoMemory) {
      // Cold start / Memory Disabled mode
      const coldScore = 50;
      const coldRisk: RiskLevel = 'UNKNOWN';
      const coldUtility = withinBudget ? 50 + ((budget - price) / (budget || 1)) * 30 : -100;

      candidateEvaluations.push({
        name: profile.name,
        capability: profile.capability,
        price,
        withinBudget,
        reliabilityScore: coldScore,
        riskLevel: coldRisk,
        commitmentsCount: 0,
        outcomesCount: 0,
        avgDelayHours: 0,
        avgQualityScore: 0,
        utilityScore: coldUtility,
        status: withinBudget ? 'SELECTED' : 'REJECTED_OVER_BUDGET',
        rejectionReason: withinBudget ? undefined : `Exceeds task budget ($${price} > $${budget})`,
        memorySummary: {
          commitments: 0,
          successful: 0,
          late: 0,
          failed: 0,
          avgQuality: 0,
          snippets: [],
        },
      });
      continue;
    }

    // Real Sibyl Memory Active
    const candidateCommitments = allCommitments.filter(
      (c) => c.counterpartyName?.toLowerCase() === candidateName.toLowerCase()
    );
    const candidateOutcomes = allOutcomes.filter(
      (o) =>
        o.counterpartyName?.toLowerCase() === candidateName.toLowerCase() ||
        candidateCommitments.some((c) => c.id === o.commitmentId)
    );

    const searchHits = await recallRelevantHistory(candidateName);
    const snippets = searchHits.hits.map((h) => h.snippet).slice(0, 3);

    const reliabilityScore = calculateReliability({
      commitments: candidateCommitments,
      outcomes: candidateOutcomes,
    });
    const riskLevel = calculateRisk(reliabilityScore, candidateOutcomes.length);

    const successfulCount = candidateOutcomes.filter((o) => o.success).length;
    const lateCount = candidateOutcomes.filter((o) => o.delayHours > 0).length;
    const failedCount = candidateOutcomes.filter((o) => !o.success).length;

    const totalDelay = candidateOutcomes.reduce((acc, o) => acc + (o.delayHours || 0), 0);
    const avgDelay =
      candidateOutcomes.length > 0 ? Math.round((totalDelay / candidateOutcomes.length) * 10) / 10 : 0;

    const totalQuality = candidateOutcomes.reduce((acc, o) => acc + (o.qualityScore || 0), 0);
    const avgQuality =
      candidateOutcomes.length > 0 ? Math.round((totalQuality / candidateOutcomes.length) * 10) / 10 : 0;

    // Calculate deterministic utility score
    // Utility balances reliability (70% weight) with price efficiency (30% weight)
    let utilityScore = 0;
    let status: CandidateEvaluation['status'] = 'SELECTED';
    let rejectionReason: string | undefined;

    if (!withinBudget) {
      utilityScore = -100;
      status = 'REJECTED_OVER_BUDGET';
      rejectionReason = `Quoted price ($${price}) exceeds the allocated budget ($${budget}).`;
    } else {
      const priceEfficiency = ((budget - price) / (budget || 1)) * 30;
      const reliabilityWeight = reliabilityScore * 0.7;

      // Risk penalty for high or critical risk
      let riskPenalty = 0;
      if (riskLevel === 'HIGH') riskPenalty = 15;
      if (riskLevel === 'CRITICAL') riskPenalty = 35;

      utilityScore = Math.round((reliabilityWeight + priceEfficiency - riskPenalty) * 10) / 10;
    }

    candidateEvaluations.push({
      name: profile.name,
      capability: profile.capability,
      price,
      withinBudget,
      reliabilityScore,
      riskLevel,
      commitmentsCount: candidateCommitments.length,
      outcomesCount: candidateOutcomes.length,
      avgDelayHours: avgDelay,
      avgQualityScore: avgQuality,
      utilityScore,
      status,
      rejectionReason,
      memorySummary: {
        commitments: candidateCommitments.length,
        successful: successfulCount,
        late: lateCount,
        failed: failedCount,
        avgQuality,
        snippets,
      },
    });
  }

  // 4. Select the best candidate deterministically
  const withinBudgetCandidates = candidateEvaluations.filter((c) => c.withinBudget);

  let selectedEval: CandidateEvaluation;

  if (withinBudgetCandidates.length === 0) {
    // If none within budget, pick the one closest to budget or fallback to first
    selectedEval = candidateEvaluations.slice().sort((a, b) => a.price - b.price)[0];
  } else {
    // Sort by utility score descending
    withinBudgetCandidates.sort((a, b) => b.utilityScore - a.utilityScore);
    selectedEval = withinBudgetCandidates[0];
  }

  // Update statuses for rejected alternatives
  for (const evalItem of candidateEvaluations) {
    if (evalItem.name === selectedEval.name) {
      evalItem.status = 'SELECTED';
      evalItem.rejectionReason = undefined;
    } else if (evalItem.withinBudget) {
      if (evalItem.price < selectedEval.price && evalItem.riskLevel === 'HIGH') {
        evalItem.status = 'REJECTED_HIGH_RISK_ALTERNATIVE';
        evalItem.rejectionReason = `Cheaper ($${evalItem.price} vs $${selectedEval.price}) but carries HIGH risk (${evalItem.reliabilityScore}/100 reputation) due to past delivery delay and quality deficiencies.`;
      } else {
        evalItem.status = 'REJECTED_LOWER_UTILITY';
        evalItem.rejectionReason = `Lower overall utility score (${evalItem.utilityScore} vs ${selectedEval.utilityScore}). Selected counterparty offers superior safety-to-cost tradeoff.`;
      }
    }
  }

  // 5. Determine Payment Strategy based on selected counterparty risk
  const selectedPrice = selectedEval.price;
  const paymentTerms = calculatePaymentStrategy(selectedEval.riskLevel, selectedPrice);

  // 6. Build Deterministic "Why?" and Reasoning
  let reasoning = '';
  const winnerRationale = simulateNoMemory
    ? `Memory recall is disabled / Cold Start simulation. Counterparty '${selectedEval.name}' was selected purely based on price ($${selectedPrice}) within the $${budget} budget, as no historical reputation could be retrieved from Sibyl Memory.`
    : `PACT selected '${selectedEval.name}' ($${selectedPrice}) because its proven historical reliability (${selectedEval.reliabilityScore}/100, ${selectedEval.riskLevel} Risk) fits within the $${budget} budget and provides the optimal safety-to-cost ratio.`;

  const comparisonPoints: string[] = [];
  const alternativesAnalysis: { candidate: string; status: string; explanation: string }[] = [];

  for (const c of candidateEvaluations) {
    if (c.name === selectedEval.name) continue;

    if (!c.withinBudget) {
      const msg = `Exceeds budget: Quoted price is $${c.price}, which is above the $${budget} limit.`;
      comparisonPoints.push(`${c.name}: Disqualified because price ($${c.price}) > budget ($${budget}).`);
      alternativesAnalysis.push({
        candidate: c.name,
        status: 'DISQUALIFIED (OVER BUDGET)',
        explanation: msg,
      });
    } else if (c.riskLevel === 'HIGH' || c.reliabilityScore < selectedEval.reliabilityScore) {
      const msg = `Rejected high-risk alternative: Although $${c.price} is cheaper than $${selectedPrice}, historical memory shows ${c.avgDelayHours}h average delay and ${c.reliabilityScore}/100 reliability. PACT refuses to risk project failure for a minor savings.`;
      comparisonPoints.push(`${c.name}: Rejected due to HIGH RISK (${c.reliabilityScore}/100 score, ${c.avgDelayHours}h past delay).`);
      alternativesAnalysis.push({
        candidate: c.name,
        status: 'REJECTED (HIGH RISK)',
        explanation: msg,
      });
    } else {
      const msg = `Rejected: Utility score ${c.utilityScore} is lower than winner (${selectedEval.utilityScore}).`;
      comparisonPoints.push(`${c.name}: Lower overall reliability/price utility score.`);
      alternativesAnalysis.push({
        candidate: c.name,
        status: 'REJECTED',
        explanation: msg,
      });
    }
  }

  if (simulateNoMemory) {
    reasoning =
      'COLD START / MEMORY DISABLED: Without persistent Sibyl Memory, all counterparties appear identical at baseline 50/100 reputation. PACT selects the cheapest candidate and assigns standard cold-start payment terms.';
  } else if (selectedEval.riskLevel === 'LOW') {
    reasoning = `${winnerRationale} Historical records in Sibyl Memory verify ${selectedEval.memorySummary.successful} on-time completions with an average quality score of ${selectedEval.avgQualityScore}/10. ${paymentTerms.summary}`;
  } else if (selectedEval.riskLevel === 'HIGH') {
    reasoning = `Only counterparty within budget is '${selectedEval.name}' ($${selectedPrice}), but Sibyl Memory reveals HIGH RISK (${selectedEval.reliabilityScore}/100 reliability). PACT enforces a strict 3-stage milestone escrow to withhold full upfront payment.`;
  } else {
    reasoning = `${winnerRationale} ${paymentTerms.summary}`;
  }

  // 7. Structured Memory Evidence
  const matchingOutcome = allOutcomes.find(
    (o) => o.counterpartyName?.toLowerCase() === selectedEval.name.toLowerCase()
  );

  const memoryEvidence = {
    hasHistory: !simulateNoMemory && selectedEval.outcomesCount > 0,
    candidateEvaluated: selectedEval.name,
    commitmentsCount: selectedEval.commitmentsCount,
    outcomesCount: selectedEval.outcomesCount,
    successfulCount: selectedEval.memorySummary.successful,
    lateCount: selectedEval.memorySummary.late,
    avgQuality: selectedEval.avgQualityScore,
    lastDelayHours: matchingOutcome?.delayHours,
    lastQualityScore: matchingOutcome?.qualityScore,
    lastNotes: matchingOutcome?.notes,
    journalSnippets: selectedEval.memorySummary.snippets,
  };

  // 8. Prepare Next Base Sepolia Escrow Action
  const profile = DEFAULT_CANDIDATE_PROFILES.find((p) => p.name === selectedEval.name);
  const beneficiaryAddress = profile?.walletAddress || DEMO_AGENT_WALLETS['ResearchAgent-A'];
  const contractAddress = getEscrowContractAddress();

  const ethScale = 0.000002;
  const ethTotal = (selectedPrice * ethScale).toFixed(6);

  const preparedEscrowAction: PreparedEscrowAction = {
    action: 'PREPARE_ESCROW',
    network: 'Base Sepolia',
    chainId: 84532,
    contractAddress: contractAddress || undefined,
    beneficiaryAddress,
    counterpartyName: selectedEval.name,
    totalAmount: selectedPrice,
    currency: 'USD (0.000002 ETH/USD scale)',
    milestones: paymentTerms.milestones,
    ethEquivalent: `${ethTotal} ETH`,
    readyToBroadcast: true,
    instructions: `PACT will lock ${ethTotal} ETH in Base Sepolia escrow across ${paymentTerms.milestoneCount} milestone(s) for ${selectedEval.name} (${beneficiaryAddress.slice(0, 6)}...${beneficiaryAddress.slice(-4)}).`,
  };

  // 9. Create and Persist Commitment in Sibyl Memory
  const commitmentId = `comm-pact-${Date.now().toString(36)}`;
  const createdCommitment: Commitment = {
    id: commitmentId,
    counterpartyId: `agent-${selectedEval.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    counterpartyName: selectedEval.name,
    task,
    budget: selectedPrice,
    expectedDeadlineHours: deadlineHours,
    expectedQuality: 8,
    createdAt: evaluatedAt,
    status: 'ACTIVE',
    paymentStrategy: paymentTerms.strategy,
    milestones: paymentTerms.milestones,
  };

  if (!simulateNoMemory) {
    try {
      await persistCommitment(createdCommitment);

      await recordSibylEvent({
        evaluated: {
          action: 'PACT_AGENT_DECISION',
          task,
          budget,
          selectedCounterparty: selectedEval.name,
          reputation: selectedEval.reliabilityScore,
          risk: selectedEval.riskLevel,
          price: selectedPrice,
          sessionId,
        },
        acted: {
          strategy: paymentTerms.strategy,
          milestones: paymentTerms.milestones.map((m) => `${m.name}: $${m.amount}`),
          nextAction: 'PREPARE_ESCROW',
        },
        forward: {
          escrowReady: true,
          watchDeadline: `${deadlineHours} hours`,
        },
        extra: {
          category: 'agent_decisions',
          name: `${selectedEval.name}-${sessionId}`,
          sessionId,
        },
      });
    } catch (e) {
      console.warn('Failed to record agent decision to Sibyl journal:', e);
    }
  }

  const decision: PactAgentDecision = {
    task,
    budget,
    deadlineHours,
    selectedCounterparty: selectedEval.name,
    reputation: selectedEval.reliabilityScore,
    riskLevel: selectedEval.riskLevel,
    price: selectedPrice,
    paymentStrategy: paymentTerms.strategy,
    paymentTerms: {
      strategy: paymentTerms.strategy,
      milestoneCount: paymentTerms.milestoneCount,
      milestones: paymentTerms.milestones,
      summary: paymentTerms.summary,
    },
    reasoning,
    whySection: {
      summary: `PACT analyzed ${candidateNames.length} available agents using Sibyl Memory and selected ${selectedEval.name}.`,
      winnerRationale,
      comparisonPoints,
      alternativesAnalysis,
    },
    memoryEvidence,
    candidatesEvaluated: candidateEvaluations,
    nextAction: 'PREPARE_ESCROW',
    preparedEscrowAction,
    commitmentCreated: createdCommitment,
    isColdStart: simulateNoMemory || selectedEval.outcomesCount === 0,
    memorySimulatedOff: simulateNoMemory,
    sessionId,
    evaluatedAt,
  };

  return decision;
}
