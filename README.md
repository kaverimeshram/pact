# PACT: Persistent Agent Commitment Tracker

> **A memory-backed reputation system for AI agents powered by Sibyl Memory & Base Sepolia Escrow.**

Built for the **Sibyl Labs Hackathon 2026**.

---

## What it does

**PACT** tracks AI agent commitments, deadlines, and delivery outcomes in persistent long-term storage (**Sibyl Memory**). It ensures that past performance (such as delivery delays, quality scores, broken promises, or dispute records) directly changes future economic decisions (such as requiring milestone payments and withholding upfront disbursements for high-risk counterparties) and enforces them through on-chain escrow contracts on **Base Sepolia**.

---

## The Problem

Autonomous AI agents frequently hire and negotiate with other AI agents or automated service providers. However, standard LLM sessions are stateless:

1. **A fresh agent session starts completely blind**: It does not remember whether a counterparty kept or broke its commitments yesterday.
2. **Untrusted counterparties exploit amnesia**: An agent that promises a 24-hour delivery but takes 38 hours with substandard quality is treated identically to a brand-new, high-trust provider in subsequent sessions.
3. **Financial loss**: The hiring agent blindly pays 100% upfront again, repeating the same counterparty failure.

---

## The Solution & Causal Chain

PACT connects agent negotiations to **Sibyl Memory** and enforces terms on **Base Sepolia**:

- **Session A**: Records promised deadlines and logs the actual outcome (e.g. 14 hours late, 6/10 quality score) into Sibyl Memory.
- **Persistent Storage**: Sibyl persists both structured entities (`counterparties`, `commitments`, `outcomes`) and COLD-tier journal events in SQLite FTS5 store (`~/.sibyl-memory/memory.db`).
- **Fresh Session B**: A brand-new session with **zero local conversational state** queries Sibyl Memory, recalls the counterparty's historical delay and quality score, deterministic mathematical scoring calculates reliability at **42/100 (HIGH RISK)**.
- **Base Sepolia Escrow**: PACT enforces a **3-Milestone Escrow Payment Plan** ($10 upfront / 20%, $20 checkpoint / 40%, $20 final verification / 40%) locked on Base Sepolia.

$$\text{SIBYL MEMORY} \longrightarrow \text{REPUTATION} \longrightarrow \text{RISK ASSESSMENT} \longrightarrow \text{PAYMENT STRATEGY} \longrightarrow \text{BASE SEPOLIA ESCROW}$$

---

## Why Sibyl is Load-Bearing

> [!IMPORTANT]
> **PACT's reputation engine depends on persistent counterparty history. A fresh session cannot reproduce the same reputation-aware decision without recalling commitments and outcomes from Sibyl Memory.**

Without Sibyl Memory, a fresh session has no access to previous interactions and falls back to a **Cold-Start Decision** (50/100 reliability, `UNKNOWN` risk, standard baseline terms). Sibyl is not an optional cache or a simple vector store—it is the single source of truth for cross-session agent accountability.

---

## Architecture Flow

```
User / Agent Task Request
           ↓
     Sibyl Recall (lib/memory/sibyl.ts)
           ↓
  Counterparty History (~/.sibyl-memory/memory.db)
           ↓
  Reputation Engine (lib/reputation.ts)
           ↓
   Decision Engine (lib/decision-engine.ts)
           ↓
  Payment Strategy (e.g. 3 Milestones: $10 / $20 / $20)
           ↓
  Base Sepolia Escrow (contracts/PACTEscrow.sol & lib/wallet.ts)
           ↓
   Delivery Outcome (Delay, Quality, Success)
           ↓
   Sibyl Persistence (Entities & COLD Journal)
```

---

## Smart Contract Layer (`contracts/PACTEscrow.sol`)

The escrow smart contract is located in [`contracts/PACTEscrow.sol`](file:///Users/mikasa05/pact/contracts/PACTEscrow.sol):
- **Network**: Base Sepolia (Chain ID: `84532`)
- **Native Currency**: ETH
- **Functions**:
  - `createEscrow(beneficiary, milestoneAmounts, commitmentId, counterpartyName)`: Creates and atomically funds a multi-milestone escrow.
  - `fundEscrow(escrowId)`: Funds a created escrow.
  - `releaseMilestone(escrowId, milestoneIndex)`: Payer approves disbursement of a specific milestone to the beneficiary.
  - `disputeEscrow(escrowId, reason)`: Marks an escrow as disputed.
  - `getEscrow(escrowId)` & `getMilestones(escrowId)`: View status and milestone flags.
- **Security**: Checks-Effects-Interactions pattern, non-reentrancy protection, zero-address validation, and double-release prevention.

---

## Fresh Session & Memory Differential Demo

### 1. With Memory (Session B Recalls Session A)
- **Candidate**: `ResearchAgent-A`
- **Recalled History**: 14 hours late delivery, 6/10 quality score.
- **Reliability Score**: `42/100`
- **Risk Level**: `HIGH RISK`
- **Decision**: **3 MILESTONES** ($10 upfront / 20%, $20 milestone 1 / 40%, $20 final verification / 40%). Full upfront payment denied.
- **On-Chain Action**: Base Sepolia escrow created locking 3 milestone disbursements.

### 2. Without Memory (Simulate No Memory / Cold Start)
- **Candidate**: `ResearchAgent-A`
- **Recalled History**: *None (Memory recall disabled)*
- **Reliability Score**: `50/100` (Baseline)
- **Risk Level**: `UNKNOWN / COLD START`
- **Decision**: **COLD-START TERMS** (30% initial deposit, 70% settlement).

---

## Setup & Running Locally

### Prerequisites
- Node.js `v20+` (v25 supported)
- Python `3.10+` (v3.14 supported)
- `uv` package manager (`brew install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Foundry `forge` (optional, for contract testing: `curl -L https://foundry.paradigm.xyz | bash`)

### Installation

1. **Clone and enter directory:**
   ```bash
   git clone <repo-url> pact
   cd pact
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Install Sibyl Memory SDK & CLI:**
   ```bash
   uv tool install 'sibyl-memory-cli[mcp]'
   ```

4. **Run the Automated Test Suites:**
   ```bash
   # Runs 17/17 core, memory, and escrow tests
   npm test

   # Runs 8/8 Foundry smart contract tests
   npm run test:contracts
   ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Base Sepolia Deployment

To deploy the escrow contract to Base Sepolia:

1. Copy `.env.example` to `.env.local` and add your deployment key:
   ```bash
   cp .env.example .env.local
   ```
   ```env
   BASE_RPC_URL=https://sepolia.base.org
   BASE_PRIVATE_KEY=0x...
   ```

2. Run the deployment script:
   ```bash
   npm run deploy:escrow
   ```

3. Add the deployed contract address to `.env.local`:
   ```env
   NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x...
   ```

---

## 2–3 Minute Judging Demo Script

1. **Dashboard Overview (0:00 - 0:30)**:
   - Point to the **Sibyl Memory: Connected** status indicator.
   - Explain the core premise: AI agents have amnesia across sessions; PACT gives them persistent memory of counterparty commitments.
2. **Trigger Guided Demo (0:30 - 1:30)**:
   - Navigate to the **Guided Demo** tab.
   - Click **Step 1**: Creates commitment for `ResearchAgent-A` (24h deadline, 8/10 quality, $10).
   - Click **Step 2**: Records bad outcome (38h delivery, 14h late, 6/10 quality).
   - Click **Step 4**: Clicks **Start Fresh Session** (demonstrates session ID changing with zero local memory).
   - Click **Step 5 & 6**: PACT queries Sibyl Memory, recalls the 14h delay, and enforces a **3-Milestone Payment Strategy** ($10 / $20 / $20) with **HIGH RISK (42/100)**.
   - Click **Step 7**: Creates **Base Sepolia Escrow** locking funds in 3 milestone disbursements.
3. **Simulate No Memory Comparison (1:30 - 2:00)**:
   - Show the side-by-side card comparing the decision **WITH MEMORY** vs **WITHOUT MEMORY**.
   - Highlight the key insight: *"Persistent memory changes the economic controls applied to the agent."*
4. **Sibyl Memory Audit (2:00 - 2:30)**:
   - Open **Sibyl Memory** tab.
   - Show raw persisted entities and execute an FTS5 search query (`ResearchAgent-A`) returning matching entities and journal logs directly from `~/.sibyl-memory/memory.db`.
