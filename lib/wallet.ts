import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseEther,
  formatEther,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import {
  DEFAULT_BASE_SEPOLIA_CHAIN_ID,
  DEFAULT_BASE_SEPOLIA_RPC,
  BASE_SEPOLIA_EXPLORER,
  PACT_ESCROW_ABI,
  getEscrowContractAddress,
  formatBaseScanTxUrl,
  DEMO_AGENT_WALLETS,
} from './contracts/pactEscrow';

export type TxStepState =
  | 'IDLE'
  | 'CONNECTING_WALLET'
  | 'SWITCHING_NETWORK'
  | 'AWAITING_APPROVAL'
  | 'BROADCASTING'
  | 'CONFIRMING'
  | 'SUCCESS'
  | 'ERROR';

export interface WalletConnectionState {
  isConnected: boolean;
  address: `0x${string}` | null;
  chainId: number | null;
  isBaseSepolia: boolean;
  error: string | null;
}

/**
 * Checks if an EIP-1193 injected provider is available in the browser.
 */
export function hasInjectedWallet(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
}

/**
 * Connects to injected wallet (MetaMask, Coinbase Wallet, etc.)
 */
export async function connectInjectedWallet(): Promise<{
  address: `0x${string}`;
  chainId: number;
}> {
  if (!hasInjectedWallet()) {
    throw new Error('No Ethereum wallet detected. Please install MetaMask or Coinbase Wallet.');
  }

  const ethereum = (window as any).ethereum;

  const accounts: string[] = await ethereum.request({
    method: 'eth_requestAccounts',
  });

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts selected in wallet.');
  }

  const chainIdHex: string = await ethereum.request({ method: 'eth_chainId' });
  const chainId = parseInt(chainIdHex, 16);

  // Switch to Base Sepolia if not currently on it
  if (chainId !== DEFAULT_BASE_SEPOLIA_CHAIN_ID) {
    await switchToBaseSepoliaNetwork();
  }

  return {
    address: accounts[0] as `0x${string}`,
    chainId: DEFAULT_BASE_SEPOLIA_CHAIN_ID,
  };
}

/**
 * Prompts wallet to switch or add Base Sepolia network (Chain ID: 84532)
 */
export async function switchToBaseSepoliaNetwork(): Promise<void> {
  if (!hasInjectedWallet()) return;
  const ethereum = (window as any).ethereum;

  const baseSepoliaHex = '0x14a34'; // 84532 in hex

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: baseSepoliaHex }],
    });
  } catch (switchError: any) {
    // Error 4902 indicates chain has not been added yet
    if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: baseSepoliaHex,
            chainName: 'Base Sepolia',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [DEFAULT_BASE_SEPOLIA_RPC],
            blockExplorerUrls: [BASE_SEPOLIA_EXPLORER],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Creates and funds a real milestone escrow on Base Sepolia using connected wallet.
 */
export async function createBaseSepoliaEscrowTx(params: {
  contractAddress?: `0x${string}` | string;
  beneficiaryAddress?: string;
  counterpartyName: string;
  milestones: { amount: number; percentage: number }[];
  commitmentId: string;
  onStatusChange?: (status: TxStepState, message: string) => void;
}): Promise<{
  txHash: string;
  explorerUrl: string;
  escrowId?: bigint;
}> {
  const {
    contractAddress = getEscrowContractAddress(),
    beneficiaryAddress = DEMO_AGENT_WALLETS[params.counterpartyName] || DEMO_AGENT_WALLETS['ResearchAgent-A'],
    counterpartyName,
    milestones,
    commitmentId,
    onStatusChange,
  } = params;

  if (!hasInjectedWallet()) {
    throw new Error('Please install or unlock an Ethereum wallet (such as MetaMask or Coinbase Wallet).');
  }

  const ethereum = (window as any).ethereum;

  onStatusChange?.('CONNECTING_WALLET', 'Requesting wallet connection...');
  const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
  const account = accounts[0] as `0x${string}`;

  onStatusChange?.('SWITCHING_NETWORK', 'Verifying Base Sepolia network (Chain ID: 84532)...');
  await switchToBaseSepoliaNetwork();

  // Calculate milestone amounts in ETH
  // For realistic testnet demo: $1 USD = 0.00001 ETH (or 0.0001 ETH total for $50 budget)
  // Milestone 1 ($10 / 20%) -> 0.00002 ETH
  // Milestone 2 ($20 / 40%) -> 0.00004 ETH
  // Milestone 3 ($20 / 40%) -> 0.00004 ETH
  const milestoneAmountsWei = milestones.map((m) => {
    // 1 USD = 0.000002 ETH scale so testnet gas and funding is easily affordable
    const ethVal = (m.amount * 0.000002).toFixed(6);
    return parseEther(ethVal);
  });

  const totalWei = milestoneAmountsWei.reduce((acc, curr) => acc + curr, BigInt(0));

  const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: custom(ethereum),
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(DEFAULT_BASE_SEPOLIA_RPC),
  });

  if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
    throw new Error(
      'PACTEscrow contract address is not configured. Deploy the contract using `npm run deploy:escrow` and set NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS in .env.local.'
    );
  }

  onStatusChange?.('AWAITING_APPROVAL', 'Please approve the escrow transaction in your wallet...');

  const txHash = await walletClient.writeContract({
    address: contractAddress as `0x${string}`,
    abi: PACT_ESCROW_ABI,
    functionName: 'createEscrow',
    args: [
      beneficiaryAddress as `0x${string}`,
      milestoneAmountsWei,
      commitmentId,
      counterpartyName,
    ],
    account,
    value: totalWei,
  });

  onStatusChange?.('BROADCASTING', `Transaction submitted: ${txHash.slice(0, 10)}...`);

  onStatusChange?.('CONFIRMING', 'Confirming on Base Sepolia...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  onStatusChange?.('SUCCESS', 'Escrow created and funded on Base Sepolia!');

  return {
    txHash,
    explorerUrl: formatBaseScanTxUrl(txHash),
  };
}

/**
 * Releases a milestone on Base Sepolia.
 */
export async function releaseBaseSepoliaMilestoneTx(params: {
  contractAddress?: `0x${string}` | string;
  escrowId: number | bigint;
  milestoneIndex: number;
  onStatusChange?: (status: TxStepState, message: string) => void;
}): Promise<{ txHash: string; explorerUrl: string }> {
  const {
    contractAddress = getEscrowContractAddress(),
    escrowId,
    milestoneIndex,
    onStatusChange,
  } = params;

  if (!hasInjectedWallet()) {
    throw new Error('Please install an Ethereum wallet.');
  }

  const ethereum = (window as any).ethereum;
  const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
  const account = accounts[0] as `0x${string}`;

  await switchToBaseSepoliaNetwork();

  const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: custom(ethereum),
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(DEFAULT_BASE_SEPOLIA_RPC),
  });

  if (!contractAddress) {
    throw new Error('Contract address not configured.');
  }

  onStatusChange?.('AWAITING_APPROVAL', 'Please approve milestone release in your wallet...');

  const txHash = await walletClient.writeContract({
    address: contractAddress as `0x${string}`,
    abi: PACT_ESCROW_ABI,
    functionName: 'releaseMilestone',
    args: [BigInt(escrowId), BigInt(milestoneIndex)],
    account,
  });

  onStatusChange?.('CONFIRMING', 'Confirming milestone release on Base Sepolia...');
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  onStatusChange?.('SUCCESS', 'Milestone released to beneficiary!');

  return {
    txHash,
    explorerUrl: formatBaseScanTxUrl(txHash),
  };
}
