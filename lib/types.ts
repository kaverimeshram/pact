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
