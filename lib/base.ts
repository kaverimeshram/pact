import { createPublicClient, createWalletClient, http, parseEther, isHex, stringToHex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  PACT_ESCROW_ABI,
  getEscrowContractAddress,
  formatBaseScanTxUrl,
  DEMO_AGENT_WALLETS,
} from './contracts/pactEscrow';

export interface BaseEscrowResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  blockNumber?: bigint;
  contractAddress?: string;
  status: 'BROADCASTED' | 'SIMULATED' | 'ENV_KEY_MISSING' | 'ERROR';
  message: string;
}

/**
 * Executes a commitment escrow or attestation on Base Sepolia.
 * Uses real RPC client and private key if provided in environment.
 */
export async function executeBaseEscrowCommitment(params: {
  commitmentId: string;
  counterpartyName: string;
  budgetEthOrUsd: number;
  strategy: string;
  milestones?: { amount: number; percentage: number }[];
}): Promise<BaseEscrowResult> {
  const rpcUrl = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://sepolia.base.org';
  const privateKey = process.env.BASE_PRIVATE_KEY;
  const contractAddress = getEscrowContractAddress();

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  if (!privateKey || !isHex(privateKey)) {
    return {
      success: true,
      status: 'ENV_KEY_MISSING',
      message:
        'Base Sepolia RPC is active. To broadcast on-chain escrow transactions from server, set BASE_PRIVATE_KEY in .env.local, or connect your browser wallet.',
    };
  }

  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    // If PACTEscrow contract is deployed, call createEscrow
    if (contractAddress) {
      const beneficiary =
        DEMO_AGENT_WALLETS[params.counterpartyName] || DEMO_AGENT_WALLETS['ResearchAgent-A'];

      const milestoneAmounts = (params.milestones || [
        { amount: 10, percentage: 20 },
        { amount: 20, percentage: 40 },
        { amount: 20, percentage: 40 },
      ]).map((m) => parseEther((m.amount * 0.000002).toFixed(6)));

      const totalWei = milestoneAmounts.reduce((a, b) => a + b, BigInt(0));

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: PACT_ESCROW_ABI,
        functionName: 'createEscrow',
        args: [beneficiary, milestoneAmounts, params.commitmentId, params.counterpartyName],
        value: totalWei,
      });

      return {
        success: true,
        txHash: hash,
        explorerUrl: formatBaseScanTxUrl(hash),
        contractAddress,
        status: 'BROADCASTED',
        message: `Escrow created on PACTEscrow contract at ${contractAddress}`,
      };
    }

    // Fallback: Create commitment attestation transaction
    const commitmentData = stringToHex(
      JSON.stringify({
        app: 'PACT',
        commitmentId: params.commitmentId,
        counterparty: params.counterpartyName,
        strategy: params.strategy,
      })
    );

    const hash = await walletClient.sendTransaction({
      to: account.address,
      value: parseEther('0.0001'),
      data: commitmentData,
    });

    return {
      success: true,
      txHash: hash,
      explorerUrl: formatBaseScanTxUrl(hash),
      status: 'BROADCASTED',
      message: `Escrow commitment recorded on Base Sepolia: ${hash}`,
    };
  } catch (err: any) {
    console.error('Base Sepolia transaction error:', err);
    return {
      success: false,
      status: 'ERROR',
      message: `Base Sepolia transaction failed: ${err.message}`,
    };
  }
}

