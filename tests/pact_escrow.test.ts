import { parseEther } from 'viem';
import {
  PACT_ESCROW_ABI,
  formatBaseScanTxUrl,
  formatBaseScanAddressUrl,
  DEMO_AGENT_WALLETS,
  DEFAULT_BASE_SEPOLIA_CHAIN_ID,
} from '../lib/contracts/pactEscrow';
import { executeBaseEscrowCommitment } from '../lib/base';
import { calculatePaymentStrategy, calculateReliability, calculateRisk } from '../lib/reputation';

async function runEscrowTests() {
  console.log('\n====================================================');
  console.log('    PACT BASE SEPOLIA ESCROW INTEGRATION TESTS      ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. ABI Verification
  const functionNames = PACT_ESCROW_ABI.filter((x: any) => x.type === 'function').map((x: any) => x.name);
  assert(functionNames.includes('createEscrow'), 'ABI includes createEscrow function');
  assert(functionNames.includes('fundEscrow'), 'ABI includes fundEscrow function');
  assert(functionNames.includes('releaseMilestone'), 'ABI includes releaseMilestone function');
  assert(functionNames.includes('getEscrow'), 'ABI includes getEscrow view function');
  assert(functionNames.includes('getMilestones'), 'ABI includes getMilestones view function');

  // 2. Base Sepolia Chain Configuration
  assert(DEFAULT_BASE_SEPOLIA_CHAIN_ID === 84532, 'Base Sepolia Chain ID is exactly 84532');
  assert(
    DEMO_AGENT_WALLETS['ResearchAgent-A'] === '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    'ResearchAgent-A demo beneficiary address configured'
  );

  // 3. Explorer URL formatting (Must never hardcode fake tx hashes)
  const sampleTx = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  const explorerUrl = formatBaseScanTxUrl(sampleTx);
  assert(
    explorerUrl === `https://sepolia.basescan.org/tx/${sampleTx}`,
    'BaseScan Sepolia transaction URL properly formatted'
  );

  // 4. Milestone Calculation for High-Risk ($50 -> 3 Milestones: $10 / $20 / $20)
  const strategy = calculatePaymentStrategy('HIGH', 50);
  assert(strategy.milestoneCount === 3, 'High Risk enforces 3 milestones');
  assert(strategy.milestones[0].amount === 10, 'Milestone 1 amount is $10 (20%)');
  assert(strategy.milestones[1].amount === 20, 'Milestone 2 amount is $20 (40%)');
  assert(strategy.milestones[2].amount === 20, 'Milestone 3 amount is $20 (40%)');

  // 5. Proportional Wei calculation
  const milestoneWeis = strategy.milestones.map((m) => parseEther((m.amount * 0.000002).toFixed(6)));
  const totalWei = milestoneWeis.reduce((a, b) => a + b, BigInt(0));
  const expectedTotalWei = parseEther((50 * 0.000002).toFixed(6));
  assert(totalWei === expectedTotalWei, 'Milestone Wei amounts sum exactly to total escrow amount');

  // 6. Base Escrow Execution without env key returns clean informative state (no faking)
  const result = await executeBaseEscrowCommitment({
    commitmentId: 'comm-test-escrow',
    counterpartyName: 'ResearchAgent-A',
    budgetEthOrUsd: 50,
    strategy: 'MILESTONE_3',
    milestones: strategy.milestones,
  });

  assert(result.success === true, 'Base escrow handler returns success status structure');
  assert(
    result.status === 'ENV_KEY_MISSING' || result.status === 'BROADCASTED',
    'Base escrow does not fabricate fake tx hashes when keys are absent'
  );

  console.log('\n====================================================');
  console.log(`ESCROW TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEscrowTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
