export const DEFAULT_BASE_SEPOLIA_CHAIN_ID = 84532;
export const DEFAULT_BASE_SEPOLIA_RPC = 'https://sepolia.base.org';
export const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org';

// Default demo agent wallet for ResearchAgent-A
export const DEMO_AGENT_WALLETS: Record<string, `0x${string}`> = {
  'ResearchAgent-A': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  'DataPipeline-B': '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  'AuditBot-C': '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
};

export const PACT_ESCROW_ABI = [
  {
    type: 'function',
    name: 'createEscrow',
    inputs: [
      { name: 'beneficiary', type: 'address', internalType: 'address payable' },
      { name: 'milestoneAmounts', type: 'uint256[]', internalType: 'uint256[]' },
      { name: 'commitmentId', type: 'string', internalType: 'string' },
      { name: 'counterpartyName', type: 'string', internalType: 'string' },
    ],
    outputs: [{ name: 'escrowId', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'fundEscrow',
    inputs: [{ name: 'escrowId', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'releaseMilestone',
    inputs: [
      { name: 'escrowId', type: 'uint256', internalType: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'disputeEscrow',
    inputs: [
      { name: 'escrowId', type: 'uint256', internalType: 'uint256' },
      { name: 'reason', type: 'string', internalType: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getEscrow',
    inputs: [{ name: 'escrowId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256', internalType: 'uint256' },
      { name: 'payer', type: 'address', internalType: 'address' },
      { name: 'beneficiary', type: 'address', internalType: 'address' },
      { name: 'totalAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'releasedAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'milestoneCount', type: 'uint256', internalType: 'uint256' },
      { name: 'status', type: 'uint8', internalType: 'enum PACTEscrow.EscrowStatus' },
      { name: 'commitmentId', type: 'string', internalType: 'string' },
      { name: 'counterpartyName', type: 'string', internalType: 'string' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMilestones',
    inputs: [{ name: 'escrowId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      { name: 'amounts', type: 'uint256[]', internalType: 'uint256[]' },
      { name: 'released', type: 'bool[]', internalType: 'bool[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEscrowCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'EscrowCreated',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'payer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'beneficiary', type: 'address', indexed: true, internalType: 'address' },
      { name: 'totalAmount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'milestoneCount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'commitmentId', type: 'string', indexed: false, internalType: 'string' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'EscrowFunded',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'payer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MilestoneReleased',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'beneficiary', type: 'address', indexed: true, internalType: 'address' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'EscrowDisputed',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'caller', type: 'address', indexed: true, internalType: 'address' },
      { name: 'reason', type: 'string', indexed: false, internalType: 'string' },
    ],
    anonymous: false,
  },
] as const;

export function getEscrowContractAddress(): `0x${string}` | null {
  const envAddr = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || process.env.ESCROW_CONTRACT_ADDRESS;
  if (envAddr && envAddr.startsWith('0x') && envAddr.length === 42) {
    return envAddr as `0x${string}`;
  }
  return null;
}

export function formatBaseScanTxUrl(txHash: string): string {
  return `${BASE_SEPOLIA_EXPLORER}/tx/${txHash}`;
}

export function formatBaseScanAddressUrl(address: string): string {
  return `${BASE_SEPOLIA_EXPLORER}/address/${address}`;
}
