import {
  calculateReliability,
  calculateRisk,
  calculatePaymentStrategy,
  aggregateCounterpartyStats,
} from '../lib/reputation';
import {
  clearMemoryStore,
  persistCommitment,
  persistOutcome,
  recallCounterparty,
  listCommitments,
  listOutcomes,
  recallRelevantHistory,
} from '../lib/memory/sibyl';
import { evaluateCounterpartyDecision } from '../lib/decision-engine';
import { Commitment, Outcome } from '../lib/types';

async function runTests() {
  console.log('====================================================');
  console.log('       PACT CORE & SIBYL INTEGRATION TEST SUITE     ');
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
  // TEST 1: New counterparty gets cold-start reputation (50 / UNKNOWN)
  // ----------------------------------------------------
  const coldScore = calculateReliability({ commitments: [], outcomes: [] });
  const coldRisk = calculateRisk(coldScore, 0);
  assert(
    coldScore === 50 && coldRisk === 'UNKNOWN',
    'Test 1: New counterparty gets cold-start reputation (score: 50, risk: UNKNOWN)',
    `Got score: ${coldScore}, risk: ${coldRisk}`
  );

  // ----------------------------------------------------
  // TEST 2: Successful on-time high quality delivery improves reliability
  // ----------------------------------------------------
  const goodOutcome: Outcome = {
    commitmentId: 'c-good',
    counterpartyId: 'agent-good',
    actualDeliveryHours: 20,
    delayHours: 0,
    qualityScore: 10,
    success: true,
    disputed: false,
    notes: 'Flawless execution',
    recordedAt: new Date().toISOString(),
  };
  const improvedScore = calculateReliability({ outcomes: [goodOutcome] });
  assert(
    improvedScore > 50,
    `Test 2: Successful on-time delivery improves reliability (${improvedScore} > 50)`,
    `Score: ${improvedScore}`
  );

  // ----------------------------------------------------
  // TEST 3: Late delivery reduces reliability
  // ----------------------------------------------------
  const lateOutcome: Outcome = {
    commitmentId: 'c-late',
    counterpartyId: 'agent-late',
    actualDeliveryHours: 38,
    delayHours: 14,
    qualityScore: 8,
    success: true,
    disputed: false,
    notes: 'Delivered 14 hours late',
    recordedAt: new Date().toISOString(),
  };
  const lateScore = calculateReliability({ outcomes: [lateOutcome] });
  assert(
    lateScore < 50,
    `Test 3: Late delivery reduces reliability (${lateScore} < 50)`,
    `Score: ${lateScore}`
  );

  // ----------------------------------------------------
  // TEST 4: Failed delivery reduces reliability significantly
  // ----------------------------------------------------
  const failedOutcome: Outcome = {
    commitmentId: 'c-fail',
    counterpartyId: 'agent-fail',
    actualDeliveryHours: 0,
    delayHours: 0,
    qualityScore: 1,
    success: false,
    disputed: true,
    notes: 'Failed to deliver deliverable',
    recordedAt: new Date().toISOString(),
  };
  const failScore = calculateReliability({ outcomes: [failedOutcome] });
  assert(
    failScore <= 25,
    `Test 4: Failed delivery significantly drops reliability (${failScore} <= 25)`,
    `Score: ${failScore}`
  );

  // ----------------------------------------------------
  // TEST 5: Quality affects reliability (Quality 6/10 vs 10/10)
  // ----------------------------------------------------
  const midQualityOutcome: Outcome = {
    ...lateOutcome,
    qualityScore: 6,
  };
  const midQualityScore = calculateReliability({ outcomes: [midQualityOutcome] });
  assert(
    midQualityScore < lateScore,
    `Test 5: Lower quality reduces score further (${midQualityScore} vs ${lateScore})`,
    `Quality 6 gave ${midQualityScore}`
  );

  // ----------------------------------------------------
  // EXACT DEMO SCENARIO VERIFICATION:
  // Expected 24h, Delivered 38h (14h delay), Quality 6/10 -> Score ~42, Risk: HIGH
  // ----------------------------------------------------
  const demoOutcome: Outcome = {
    commitmentId: 'comm-101',
    counterpartyId: 'agent-researchagent-a',
    counterpartyName: 'ResearchAgent-A',
    actualDeliveryHours: 38,
    delayHours: 14,
    qualityScore: 6,
    success: true,
    disputed: false,
    notes: 'Delivered 14h late, quality 6/10',
    recordedAt: '2026-09-02T00:00:00Z',
  };
  const demoScore = calculateReliability({ outcomes: [demoOutcome] });
  const demoRisk = calculateRisk(demoScore, 1);
  const demoStrategy = calculatePaymentStrategy(demoRisk, 50);

  assert(
    demoScore === 42,
    `Exact Demo Scenario: Reliability is exactly 42/100 (Calculated: ${demoScore})`,
    `Score: ${demoScore}`
  );
  assert(
    demoRisk === 'HIGH',
    `Exact Demo Scenario: Risk level is HIGH (Calculated: ${demoRisk})`,
    `Risk: ${demoRisk}`
  );
  assert(
    demoStrategy.strategy === 'MILESTONE_3' && demoStrategy.milestoneCount === 3,
    `Test 6: Recalled history changes payment strategy to 3 MILESTONES (Count: ${demoStrategy.milestoneCount})`,
    `Strategy: ${demoStrategy.strategy}`
  );
  assert(
    demoStrategy.milestones[0].amount === 10 &&
      demoStrategy.milestones[1].amount === 20 &&
      demoStrategy.milestones[2].amount === 20,
    `Exact Demo Milestone Breakdown: $10 upfront, $20 checkpoint, $20 final verification`,
    `Milestones: ${JSON.stringify(demoStrategy.milestones.map((m) => m.amount))}`
  );

  // ----------------------------------------------------
  // TEST 7: Sibyl Memory Persistence & Cross-Session Recall
  // ----------------------------------------------------
  console.log('\n--- Testing Real Sibyl Memory Storage & Fresh Session Recall ---');
  await clearMemoryStore();

  const commEntity: Commitment = {
    id: 'comm-test-sess-a',
    counterpartyId: 'agent-researchagent-a',
    counterpartyName: 'ResearchAgent-A',
    task: 'Market research report',
    budget: 50,
    expectedDeadlineHours: 24,
    expectedQuality: 8,
    createdAt: '2026-09-01T10:00:00Z',
    status: 'COMPLETED',
  };

  // Session A writes commitment & outcome to Sibyl Memory
  await persistCommitment(commEntity);
  await persistOutcome(demoOutcome);

  // Fresh Session B (no local variable memory, reads purely from Sibyl)
  const freshCommitments = await listCommitments();
  const freshOutcomes = await listOutcomes();
  const searchResults = await recallRelevantHistory('ResearchAgent-A');

  assert(
    freshCommitments.length >= 1 && freshOutcomes.length >= 1,
    'Test 7: Fresh session retrieves previous history directly from Sibyl Memory',
    `Commitments: ${freshCommitments.length}, Outcomes: ${freshOutcomes.length}`
  );

  // ----------------------------------------------------
  // TEST 8 & 9: Decision with Memory vs "Simulate No Memory" (Cold Start)
  // ----------------------------------------------------
  console.log('\n--- Testing Decision Engine: Memory vs Cold-Start Differential ---');

  // Decision WITH Sibyl Memory in fresh session B
  const decisionWithMemory = await evaluateCounterpartyDecision({
    task: 'I need a research agent for a $50 task.',
    budget: 50,
    candidateName: 'ResearchAgent-A',
    simulateNoMemory: false,
    sessionId: 'session-b-with-memory',
  });

  // Decision WITHOUT Memory (Simulated Cold Start)
  const decisionWithoutMemory = await evaluateCounterpartyDecision({
    task: 'I need a research agent for a $50 task.',
    budget: 50,
    candidateName: 'ResearchAgent-A',
    simulateNoMemory: true,
    sessionId: 'session-c-no-memory',
  });

  assert(
    decisionWithMemory.reliabilityScore === 42 &&
      decisionWithMemory.riskLevel === 'HIGH' &&
      decisionWithMemory.milestoneCount === 3 &&
      decisionWithMemory.paymentStrategy === 'MILESTONE_3',
    'Test 8: Decision WITH memory accurately enforces 3 milestones & High Risk',
    `Got score: ${decisionWithMemory.reliabilityScore}, risk: ${decisionWithMemory.riskLevel}, milestones: ${decisionWithMemory.milestoneCount}`
  );

  assert(
    decisionWithoutMemory.reliabilityScore === 50 &&
      decisionWithoutMemory.riskLevel === 'UNKNOWN' &&
      decisionWithoutMemory.isColdStart === true &&
      decisionWithoutMemory.paymentStrategy === 'STANDARD_COLD_START',
    'Test 9: Decision WITHOUT memory (Cold Start) falls back to UNKNOWN / standard terms',
    `Got score: ${decisionWithoutMemory.reliabilityScore}, risk: ${decisionWithoutMemory.riskLevel}, strategy: ${decisionWithoutMemory.paymentStrategy}`
  );

  assert(
    decisionWithMemory.paymentStrategy !== decisionWithoutMemory.paymentStrategy &&
      decisionWithMemory.milestoneCount !== decisionWithoutMemory.milestoneCount,
    'CRITICAL PROOF: The exact same task produces materially different decisions with vs without memory!',
    `With Memory: ${decisionWithMemory.paymentStrategy} (${decisionWithMemory.milestoneCount} milestones) vs Without Memory: ${decisionWithoutMemory.paymentStrategy} (${decisionWithoutMemory.milestoneCount} milestones)`
  );

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite runtime error:', err);
  process.exit(1);
});
