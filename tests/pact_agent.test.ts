import { runPactAgentWorkflow, DEFAULT_CANDIDATE_PROFILES } from '../lib/pact-agent';
import { clearMemoryStore } from '../lib/memory/sibyl';
import { seedDemoDataset } from '../app/api/demo/reset/route';
import { calculateReliability, calculateRisk } from '../lib/reputation';

async function runAgentTestSuite() {
  console.log('====================================================');
  console.log('       PACT AGENT WORKFLOW TEST SUITE (PHASE 5)     ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (details) console.error(`   Details: ${details}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // Setup: Seed clean demo dataset into Sibyl Memory
  // ----------------------------------------------------
  console.log('--- Seeding Sibyl Memory with Multi-Agent History ---');
  await clearMemoryStore();
  const seedResult = await seedDemoDataset(false);
  assert(
    seedResult.counterparties.length >= 3 && seedResult.outcomes.length >= 10,
    'Seed Setup: Seeded ResearchAgent-A, B, C with rich historical outcomes into Sibyl',
    `Counterparties: ${seedResult.counterparties.length}, Outcomes: ${seedResult.outcomes.length}`
  );

  // ----------------------------------------------------
  // TEST A: Agent receives structured task and returns valid decision
  // ----------------------------------------------------
  console.log('\n--- Test A: Structured Task Processing ---');
  const decisionA = await runPactAgentWorkflow({
    task: 'Produce a market research report',
    budget: 60,
    deadlineHours: 24,
    sessionId: 'test-session-a',
  });

  assert(
    decisionA !== null && typeof decisionA === 'object',
    'Test A.1: Agent returns a valid structured decision object'
  );
  assert(
    decisionA.selectedCounterparty === 'ResearchAgent-B',
    `Test A.2: Selected counterparty is ResearchAgent-B (Got: ${decisionA.selectedCounterparty})`,
    `Selected: ${decisionA.selectedCounterparty}`
  );
  assert(
    decisionA.price === 55,
    `Test A.3: Price is recorded accurately ($55, within $60 budget)`
  );
  assert(
    decisionA.nextAction === 'PREPARE_ESCROW',
    `Test A.4: Next action is PREPARE_ESCROW`
  );

  // ----------------------------------------------------
  // TEST B: Sibyl Memory Query & Entity Recall
  // ----------------------------------------------------
  console.log('\n--- Test B: Sibyl Memory Persistence & Evidence Recall ---');
  assert(
    decisionA.memoryEvidence.hasHistory === true,
    'Test B.1: Memory evidence indicates historical records were recalled from Sibyl'
  );
  assert(
    decisionA.memoryEvidence.commitmentsCount >= 8,
    `Test B.2: Recalled at least 8 historical commitments for ResearchAgent-B (Got: ${decisionA.memoryEvidence.commitmentsCount})`
  );
  assert(
    decisionA.memoryEvidence.avgQuality >= 8.0,
    `Test B.3: Average quality score recalled from Sibyl is >= 8.0/10 (Got: ${decisionA.memoryEvidence.avgQuality})`
  );

  // ----------------------------------------------------
  // TEST C: Deterministic Mathematical Reputation Scoring
  // ----------------------------------------------------
  console.log('\n--- Test C: Deterministic Reputation Mathematics ---');
  const evalA = decisionA.candidatesEvaluated.find((c) => c.name === 'ResearchAgent-A');
  const evalB = decisionA.candidatesEvaluated.find((c) => c.name === 'ResearchAgent-B');
  const evalC = decisionA.candidatesEvaluated.find((c) => c.name === 'ResearchAgent-C');

  assert(
    evalA !== undefined && evalA.reliabilityScore === 42 && evalA.riskLevel === 'HIGH',
    `Test C.1: ResearchAgent-A calculated reliability is exactly 42/100 (HIGH RISK) due to past 14h delay (Got: ${evalA?.reliabilityScore})`
  );
  assert(
    evalB !== undefined && evalB.reliabilityScore === 76 && evalB.riskLevel === 'LOW',
    `Test C.2: ResearchAgent-B calculated reliability is exactly 76/100 (LOW RISK) (Got: ${evalB?.reliabilityScore})`
  );
  assert(
    evalC !== undefined && evalC.reliabilityScore >= 90 && evalC.riskLevel === 'LOW',
    `Test C.3: ResearchAgent-C calculated reliability is >= 90/100 (LOW RISK) (Got: ${evalC?.reliabilityScore})`
  );

  // ----------------------------------------------------
  // TEST D: Cheaper High-Risk Counterparty Loses to Reliable Counterparty
  // ----------------------------------------------------
  console.log('\n--- Test D: Safety Over Naive Cost Minimization ---');
  assert(
    evalA !== undefined && evalB !== undefined && evalA.price < evalB.price,
    `Test D.1: Precondition verified: Agent A ($40) is cheaper than Agent B ($55)`
  );
  assert(
    decisionA.selectedCounterparty === 'ResearchAgent-B',
    `Test D.2: PACT chooses Agent B ($55) over cheaper Agent A ($40) because Agent A carries HIGH RISK (42/100 reputation)`
  );
  assert(
    evalA?.status === 'REJECTED_HIGH_RISK_ALTERNATIVE',
    `Test D.3: Agent A is marked with explicit status REJECTED_HIGH_RISK_ALTERNATIVE (Got: ${evalA?.status})`
  );
  assert(
    evalC?.status === 'REJECTED_OVER_BUDGET',
    `Test D.4: Agent C ($85) is marked REJECTED_OVER_BUDGET for $60 budget task (Got: ${evalC?.status})`
  );

  // ----------------------------------------------------
  // TEST E: Decision Contains Memory Evidence & Deterministic Explanation
  // ----------------------------------------------------
  console.log('\n--- Test E: Explainability & "Why?" Rationale Generation ---');
  assert(
    decisionA.whySection !== undefined && decisionA.whySection.winnerRationale.length > 20,
    'Test E.1: Decision contains detailed, deterministic whySection'
  );
  assert(
    decisionA.whySection.comparisonPoints.length >= 2,
    `Test E.2: Decision contains specific comparison factors for alternatives (Count: ${decisionA.whySection.comparisonPoints.length})`
  );
  assert(
    decisionA.whySection.alternativesAnalysis.some((alt) => alt.candidate === 'ResearchAgent-A' && alt.status.includes('HIGH RISK')),
    'Test E.3: Alternatives analysis explicitly articulates why ResearchAgent-A was rejected'
  );

  // ----------------------------------------------------
  // TEST F: Memory-Disabled / Cold-Start Differential Proof
  // ----------------------------------------------------
  console.log('\n--- Test F: Memory Differential (With Memory vs Cold Start) ---');
  const decisionColdStart = await runPactAgentWorkflow({
    task: 'Produce a market research report',
    budget: 60,
    deadlineHours: 24,
    simulateNoMemory: true,
    sessionId: 'test-session-cold',
  });

  assert(
    decisionColdStart.memorySimulatedOff === true && decisionColdStart.isColdStart === true,
    'Test F.1: Cold start decision flags memorySimulatedOff = true'
  );
  assert(
    decisionColdStart.selectedCounterparty === 'ResearchAgent-A',
    `Test F.2: WITHOUT memory, PACT blindly picks the cheapest candidate ResearchAgent-A ($40) because all candidates appear equally unrated (50 score)`,
    `Got: ${decisionColdStart.selectedCounterparty}`
  );
  assert(
    decisionA.selectedCounterparty !== decisionColdStart.selectedCounterparty,
    `CRITICAL PROOF: With Sibyl Memory -> Selected '${decisionA.selectedCounterparty}' | Without Sibyl Memory -> Selected '${decisionColdStart.selectedCounterparty}'!`,
    `Memory altered agent selection from ${decisionColdStart.selectedCounterparty} to ${decisionA.selectedCounterparty}`
  );

  // ----------------------------------------------------
  // TEST G: Budget-Constrained Task Forces Milestone Escrow on High-Risk Agent
  // ----------------------------------------------------
  console.log('\n--- Test G: Budget-Constrained Scenario ($45 Budget) ---');
  const decisionTightBudget = await runPactAgentWorkflow({
    task: 'Produce a market research report on a tight budget',
    budget: 45,
    deadlineHours: 24,
    sessionId: 'test-session-tight',
  });

  assert(
    decisionTightBudget.selectedCounterparty === 'ResearchAgent-A',
    `Test G.1: For $45 budget, ResearchAgent-A ($40) is the only candidate within budget (Selected: ${decisionTightBudget.selectedCounterparty})`
  );
  assert(
    decisionTightBudget.paymentStrategy === 'MILESTONE_3',
    `Test G.2: PACT protects the user by enforcing 3 MILESTONE ESCROW on ResearchAgent-A (Got: ${decisionTightBudget.paymentStrategy})`
  );
  assert(
    decisionTightBudget.paymentTerms.milestoneCount === 3 &&
      decisionTightBudget.paymentTerms.milestones[0].percentage === 20,
    `Test G.3: 20% upfront ($8 for $40), 40% milestone 1 ($16), 40% final verification ($16)`
  );

  // ----------------------------------------------------
  // TEST H: Base Sepolia Escrow Prepared Action
  // ----------------------------------------------------
  console.log('\n--- Test H: Base Sepolia Prepared Escrow Action ---');
  assert(
    decisionA.preparedEscrowAction.action === 'PREPARE_ESCROW' &&
      decisionA.preparedEscrowAction.chainId === 84532 &&
      decisionA.preparedEscrowAction.network === 'Base Sepolia',
    'Test H.1: Prepared escrow action specifies Base Sepolia (Chain ID: 84532)'
  );
  assert(
    decisionA.preparedEscrowAction.beneficiaryAddress.startsWith('0x'),
    `Test H.2: Beneficiary address is formatted as a valid hex wallet: ${decisionA.preparedEscrowAction.beneficiaryAddress}`
  );
  assert(
    decisionA.preparedEscrowAction.totalAmount === 55,
    `Test H.3: Total escrow amount matches selected price ($55)`
  );

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAgentTestSuite().catch((err) => {
  console.error('Agent test suite runtime error:', err);
  process.exit(1);
});
