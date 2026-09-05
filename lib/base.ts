import { createPublicClient, createWalletClient, http, parseEther, isHex, stringToHex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

export interface BaseEscrowResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  blockNumber?: bigint;
  status: 'BROADCASTED' | 'SIMULATED' | 'ENV_KEY_MISSING';
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
}): Promise<BaseEscrowResult> {
  const rpcUrl = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
  const privateKey = process.env.BASE_PRIVATE_KEY;

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  if (!privateKey || !isHex(privateKey)) {
    // Return explicit state indicating Base RPC client is configured and waiting for wallet key
    const mockCommitmentPayload = JSON.stringify({
      commitmentId: params.commitmentId,
      counterparty: params.counterpartyName,
      strategy: params.strategy,
      timestamp: Date.now(),
    });

    return {
      success: true,
      status: 'ENV_KEY_MISSING',
      message:
        'Base Sepolia client is active. To broadcast live on-chain escrow transactions, set BASE_PRIVATE_KEY in .env.local.',
    };
  }

  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    // Create commitment attestation memo in data field
    const commitmentData = stringToHex(
      JSON.stringify({
        app: 'PACT',
        commitmentId: params.commitmentId,
        counterparty: params.counterpartyName,
        strategy: params.strategy,
      })
    );

    // Send a 0.0001 ETH escrow or self-attestation on Base Sepolia
    const hash = await walletClient.sendTransaction({
      to: account.address, // Self-attestation or escrow target
      value: parseEther('0.0001'),
      data: commitmentData,
    });

    return {
      success: true,
      txHash: hash,
      explorerUrl: `https://sepolia.basescan.org/tx/${hash}`,
      status: 'BROADCASTED',
      message: `Escrow commitment broadcasted on Base Sepolia: ${hash}`,
    };
  } catch (err: any) {
    console.error('Base Sepolia transaction error:', err);
    return {
      success: false,
      status: 'SIMULATED',
      message: `Base Sepolia transaction failed: ${err.message}`,
    };
  }
}
