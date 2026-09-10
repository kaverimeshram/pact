export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';

export type PaymentStrategyType =
  | 'FULL_UPFRONT'
  | 'SPLIT_50_50'
  | 'MILESTONE_3'
  | 'STRICT_ESCROW_NO_UPFRONT'
  | 'STANDARD_COLD_START';

export interface Milestone {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  condition: string;
  status: 'PENDING' | 'RELEASED' | 'DISPUTED';
}

export interface Counterparty {
  id: string;
  name: string;
  capability: string;
  reliabilityScore: number; // 0-100 (starting baseline 50)
  riskLevel: RiskLevel;
  commitments: number;
  successfulCommitments: number;
  failedCommitments: number;
  lateCommitments: number;
  averageDelay: number; // hours
  averageQuality: number; // 1-10
  lastInteraction?: string;
  isColdStart?: boolean;
}

export type CommitmentStatus = 'PROPOSED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'DISPUTED';

export interface Commitment {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  task: string;
  budget: number;
  expectedDeadlineHours: number;
  expectedQuality: number; // 1-10 scale
  createdAt: string;
  status: CommitmentStatus;
  paymentStrategy?: PaymentStrategyType;
  milestones?: Milestone[];
  txHash?: string; // Optional Base transaction hash
}

export interface Outcome {
  commitmentId: string;
  counterpartyId: string;
  counterpartyName?: string;
  actualDeliveryHours: number;
  delayHours: number;
  qualityScore: number; // 1-10 scale
  success: boolean;
  disputed: boolean;
  notes: string;
  recordedAt: string;
  txHash?: string; // Base verification tx hash
}

export interface Decision {
  selectedCounterparty: string;
  counterpartyId: string;
  task: string;
  budget: number;
  reliabilityScore: number;
  riskLevel: RiskLevel;
  paymentStrategy: PaymentStrategyType;
  milestoneCount: number;
  milestones: Milestone[];
  reasoning: string;
  memoryEvidence: {
    hasHistory: boolean;
    commitmentsCount: number;
    outcomesCount: number;
    lastDelayHours?: number;
    lastQualityScore?: number;
    lastNotes?: string;
    journalEventsCount: number;
    snippets?: string[];
  };
  isColdStart: boolean;
  memorySimulatedOff?: boolean;
  evaluatedAt: string;
  sessionId: string;
}

export interface SibylEntity<T = any> {
  id: string;
  tenant_id: string;
  category: string;
  name: string;
  status: string | null;
  body: T;
  created_at: string;
  updated_at: string;
}

export interface SibylJournalEvent {
  id: string;
  ts: string;
  evaluated?: Record<string, any>;
  acted?: Record<string, any>;
  forward?: Record<string, any>;
  extra?: Record<string, any>;
}

export interface SibylSearchResult {
  tier: string;
  key: string;
  category: string | null;
  body: any;
  snippet: string;
  rank: number;
  ts?: string;
}

// ==========================================
// Phase 5: PACT Real Agent Workflow Types
// ==========================================

export interface CandidateProfile {
  name: string;
  capability: string;
  basePrice: number;
  walletAddress?: string;
}

export interface CandidateEvaluation {
  name: string;
  capability: string;
  price: number;
  withinBudget: boolean;
  reliabilityScore: number;
  riskLevel: RiskLevel;
  commitmentsCount: number;
  outcomesCount: number;
  avgDelayHours: number;
  avgQualityScore: number;
  utilityScore: number;
  status: 'SELECTED' | 'REJECTED_OVER_BUDGET' | 'REJECTED_HIGH_RISK_ALTERNATIVE' | 'REJECTED_LOWER_UTILITY' | 'DISQUALIFIED';
  rejectionReason?: string;
  memorySummary: {
    commitments: number;
    successful: number;
    late: number;
    failed: number;
    avgQuality: number;
    snippets: string[];
  };
}

export interface PreparedEscrowAction {
  action: 'PREPARE_ESCROW';
  network: string;
  chainId: number;
  contractAddress?: string;
  beneficiaryAddress: string;
  counterpartyName: string;
  totalAmount: number;
  currency: string;
  milestones: Milestone[];
  ethEquivalent: string;
  readyToBroadcast: boolean;
  instructions: string;
}

export interface PactAgentInput {
  task: string;
  budget: number;
  deadlineHours: number;
  candidatePool?: string[];
  simulateNoMemory?: boolean;
  sessionId?: string;
}

export interface PactAgentDecision {
  task: string;
  budget: number;
  deadlineHours: number;
  selectedCounterparty: string;
  reputation: number;
  riskLevel: RiskLevel;
  price: number;
  paymentStrategy: PaymentStrategyType;
  paymentTerms: {
    strategy: PaymentStrategyType;
    milestoneCount: number;
    milestones: Milestone[];
    summary: string;
  };
  reasoning: string;
  whySection: {
    summary: string;
    winnerRationale: string;
    comparisonPoints: string[];
    alternativesAnalysis: {
      candidate: string;
      status: string;
      explanation: string;
    }[];
  };
  memoryEvidence: {
    hasHistory: boolean;
    candidateEvaluated: string;
    commitmentsCount: number;
    outcomesCount: number;
    successfulCount: number;
    lateCount: number;
    avgQuality: number;
    lastDelayHours?: number;
    lastQualityScore?: number;
    lastNotes?: string;
    journalSnippets: string[];
  };
  candidatesEvaluated: CandidateEvaluation[];
  nextAction: 'PREPARE_ESCROW';
  preparedEscrowAction: PreparedEscrowAction;
  commitmentCreated?: Commitment;
  isColdStart: boolean;
  memorySimulatedOff: boolean;
  sessionId: string;
  evaluatedAt: string;
}

