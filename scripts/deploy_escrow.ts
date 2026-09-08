import { createPublicClient, createWalletClient, http, isHex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PACT Base Sepolia Deployment Script
 *
 * Deploys the PACTEscrow smart contract to Base Sepolia testnet.
 * Usage:
 *   npx tsx scripts/deploy_escrow.ts
 *
 * Requirements:
 *   BASE_PRIVATE_KEY set in .env.local or environment (0x...)
 *   Base Sepolia ETH for gas (faucet: https://www.alchemy.com/faucets/base-sepolia or https://learnweb3.io/faucets/base_sepolia/)
 */
async function main() {
  console.log('====================================================');
  console.log('       PACT ESCROW — BASE SEPOLIA DEPLOYMENT        ');
  console.log('====================================================\n');

  const rpcUrl = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://sepolia.base.org';
  const privateKey = process.env.BASE_PRIVATE_KEY;

  if (!privateKey || !isHex(privateKey)) {
    console.error('❌ ERROR: BASE_PRIVATE_KEY is not set or not a valid hex string in environment/.env.local');
    console.error('Please add your deployment key to .env.local:');
    console.error('  BASE_PRIVATE_KEY=0x...\n');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`📡 Network: Base Sepolia (Chain ID: ${baseSepolia.id})`);
  console.log(`🌐 RPC Endpoint: ${rpcUrl}`);
  console.log(`👤 Deployer Address: ${account.address}`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Deployer Balance: ${(Number(balance) / 1e18).toFixed(6)} ETH`);

  if (balance === BigInt(0)) {
    console.error('❌ ERROR: Deployer balance is 0 ETH on Base Sepolia.');
    console.error('Get testnet ETH at https://www.alchemy.com/faucets/base-sepolia or https://faucets.chain.link/base-sepolia');
    process.exit(1);
  }

  // Read artifact
  const artifactPath = path.resolve(__dirname, '../out/PACTEscrow.sol/PACTEscrow.json');
  if (!fs.existsSync(artifactPath)) {
    console.error('❌ Artifact not found. Run `forge build` first.');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bytecode = artifact.bytecode?.object as `0x${string}`;
  const abi = artifact.abi;

  console.log('\n🚀 Deploying PACTEscrow contract...');

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const txHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [],
  });

  console.log(`📝 Deployment Transaction Submitted: ${txHash}`);
  console.log(`🔍 Explorer: https://sepolia.basescan.org/tx/${txHash}`);
  console.log('⏳ Waiting for block confirmation on Base Sepolia...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (!receipt.contractAddress) {
    throw new Error('Deployment receipt missing contract address');
  }

  const contractAddress = receipt.contractAddress;
  console.log('\n====================================================');
  console.log('✅ PACTEscrow SUCCESSFULLY DEPLOYED TO BASE SEPOLIA');
  console.log('====================================================');
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔍 View on BaseScan: https://sepolia.basescan.org/address/${contractAddress}`);
  console.log(`📦 Block Number:     ${receipt.blockNumber}`);
  console.log(`⛽ Gas Used:         ${receipt.gasUsed.toString()}`);
  console.log('====================================================\n');

  console.log('👉 Next Steps:');
  console.log(`Add the contract address to your .env.local:`);
  console.log(`  NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=${contractAddress}\n`);
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message);
  process.exit(1);
});
