# PACT

### Persistent reputation for AI agents.

PACT is a persistent reputation and commitment layer for AI agents. As autonomous agents increasingly transact with other agents and service providers, stateless sessions cannot remember who kept promises. PACT uses Sibyl Memory to persist commitments, delivery outcomes, delays, quality scores, and counterparty history—directly transforming historical trust signals into risk-aware counterparty selection and milestone escrow terms.

---

## 1. What PACT Is

Autonomous AI agents frequently hire and negotiate with sub-agents or external service providers. However, standard LLM sessions are stateless: a fresh session starts completely blind, unable to recall whether a counterparty delivered on time or defaulted on a previous commitment.

PACT solves agent amnesia by introducing a persistent memory-backed accountability layer:
- **Tracks Commitments**: Records promised tasks, budgets, deadlines, and expected quality.
- **Persists Outcomes**: Logs actual delivery times, delays, quality ratings, and dispute statuses into **Sibyl Memory**.
- **Calculates Reputation**: Computes deterministic reliability scores (0–100) and risk classifications (`LOW`, `MEDIUM`, `HIGH`, `UNKNOWN`).
- **Governs Economic Decisions**: Replaces naive cost-minimization with risk-adjusted counterparty selection and multi-stage escrow milestones.

---

## 2. The Core Loop

The diagram below illustrates the end-to-end causal chain from persistent memory recall to on-chain escrow preparation:

```
┌─────────────────────────────────────────────────────────┐
│                      Sibyl Memory                       │
│        (SQLite FTS5 Persistent Entity & Journal Store)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                  Counterparty History                   │
│   (Historical Commitments, Delays, Quality Scores)     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    Reputation Engine                    │
│      (Deterministic Scoring: 0-100 & Risk Tiers)        │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     Agent Decision                      │
│        (Risk-Aware Selection vs Naive Cost Minimization)│
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    Payment Strategy                     │
│    (Full Upfront vs 2-Stage Deposit vs 3-Stage Escrow)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                       Base Escrow                       │
│    (Prepared Multi-Milestone Escrow on Base Sepolia)    │
└─────────────────────────────────────────────────────────┘
```

**Sibyl Memory is load-bearing throughout this loop.** The agent's economic choices (who to hire and how to structure payments) depend directly on the historical outcome data stored in Sibyl.

---

## 3. The Key Demo Scenario

Consider an autonomous agent assigned the following task:
- **Task**: Produce a market research report
- **Budget**: $60
- **Deadline**: 24 hours

The agent evaluates three available candidates:

| Candidate | Price | Reputation | Risk Level | Historical Track Record (from Sibyl Memory) | Evaluation Outcome |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **ResearchAgent-A** | **$40** | **42 / 100** | **HIGH** | Previous delivery was **14 hours late**; quality score **6/10**. | **Rejected (High Risk)** — Cheaper, but past failure poses unacceptable execution risk. |
| **ResearchAgent-B** | **$55** | **76 / 100** | **LOW** | 8 historical commitments, consistent on-time delivery, **8.8/10** average quality. | **SELECTED** — Fits within the $60 budget and holds a proven reliability record. |
| **ResearchAgent-C** | **$85** | **94 / 100** | **LOW** | Flawless historical record, premium specialized capabilities. | **Rejected (Over Budget)** — Exceeds the $60 task budget. |

### Decision Logic
A naive agent without memory would select **ResearchAgent-A** simply because $40 is the cheapest option. PACT queries Sibyl Memory, detects Agent A's past 14-hour delay and degraded quality score, and selects **ResearchAgent-B** ($55). 

PACT prioritizes learned reliability and safety over naive cost minimization.

---

## 4. Memory vs. Cold Start

PACT demonstrates a measurable behavioral divergence when persistent memory is present versus when it is omitted:

### WITH MEMORY
1. Queries Sibyl Memory to retrieve past commitments, delays, and quality metrics for all candidates.
2. Calculates exact reliability scores (`Agent A: 42/100`, `Agent B: 76/100`, `Agent C: 94/100`).
3. Rejects high-risk candidate `ResearchAgent-A` ($40) and selects `ResearchAgent-B` ($55).
4. Configures structured milestone escrow protection tailored to counterparty risk.

### WITHOUT MEMORY (Cold Start)
1. Has no historical records or outcome data for any candidate.
2. Assigns default baseline reputation (`50/100`, `UNKNOWN` risk) across all candidates.
3. Blindly selects `ResearchAgent-A` ($40) solely because it is the lowest nominal quote.
4. Leaves the hiring agent vulnerable to repeated counterparty delivery failures.

> **"Same task. Same candidates. Different decision."**

---

## 5. Why Sibyl Memory is Load-Bearing

Sibyl Memory is not an optional log viewer or presentation cache. It is a foundational dependency in PACT's decision pipeline:

- **Mathematical Dependency**: Reputation scores are deterministically computed from historical delivery outcomes (delays, quality ratings, dispute events) persisted in Sibyl Memory (`~/.sibyl-memory/memory.db`).
- **Amnesia Prevention**: When an agent session terminates, all in-memory LLM state is lost. A subsequent session relying on local variables cannot differentiate between a reliable partner and a serial defaulter.
- **Causal Impact**: Deleting or bypassing Sibyl Memory strips away the historical evidence, causing the decision engine to fall back to uncalibrated cold-start defaults.

Without Sibyl Memory, PACT cannot perform risk-aware selection or enforce learned economic controls.

---

## 6. Architecture & Codebase Map

| File Path | Description |
| :--- | :--- |
| [`lib/memory/sibyl.ts`](file:///Users/mikasa05/pact/lib/memory/sibyl.ts) | Bridge interface connecting to the Sibyl Memory Python CLI (`uv run --with sibyl-memory-cli`). Handles entity persistence (`commitments`, `outcomes`, `counterparties`), structured queries, and journal event logging. |
| [`lib/reputation.ts`](file:///Users/mikasa05/pact/lib/reputation.ts) | Deterministic scoring engine. Calculates reliability scores (0–100), risk tiers (`LOW`, `MEDIUM`, `HIGH`, `UNKNOWN`), and risk-adjusted milestone payment structures. |
| [`lib/decision-engine.ts`](file:///Users/mikasa05/pact/lib/decision-engine.ts) | Core decision engine for individual counterparty evaluations. Compares memory-backed decisions against simulated cold-start baselines. |
| [`lib/pact-agent.ts`](file:///Users/mikasa05/pact/lib/pact-agent.ts) | Orchestrator for the autonomous multi-agent workflow: task intake, candidate ranking, Sibyl memory recall, commitment creation, and escrow preparation. |
| [`app/api/pact/agent/route.ts`](file:///Users/mikasa05/pact/app/api/pact/agent/route.ts) | Next.js API route exposing `POST /api/pact/agent` for automated agent evaluations and `GET` for presets and candidate metadata. |
| [`components/AgentView.tsx`](file:///Users/mikasa05/pact/components/AgentView.tsx) | Interactive dashboard interface for the PACT Agent. Features live decision inspection, candidate comparison cards, reasoning breakdowns, and Base Sepolia escrow review. |
| [`contracts/PACTEscrow.sol`](file:///Users/mikasa05/pact/contracts/PACTEscrow.sol) | Solidity smart contract for multi-milestone agent escrow on Base Sepolia. Implements non-reentrancy checks, milestone release controls, and dispute handling. |
| [`tests/pact_core.test.ts`](file:///Users/mikasa05/pact/tests/pact_core.test.ts) | Core test suite covering reputation calculations, milestone breakdown math, fresh session memory recall, and Base Sepolia contract definitions (17 test cases). |
| [`tests/pact_agent.test.ts`](file:///Users/mikasa05/pact/tests/pact_agent.test.ts) | Multi-agent workflow test suite verifying candidate selection, safety over cost minimization, explainability rationale, and cold-start differentials (10 test cases). |

---

## 7. Interactive Demo

### Prerequisites
- **Node.js**: `v20+`
- **Python**: `3.10+`
- **uv**: Package manager (`curl -LsSf https://astral.sh/uv/install.sh | sh` or `brew install uv`)
- **Sibyl CLI**: `uv tool install 'sibyl-memory-cli[mcp]'`

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open the Agent Workflow:**
   Navigate to [http://localhost:3000/agent](http://localhost:3000/agent) in your browser.

### What to Observe:
1. **Input Task**: Select the default preset:
   - **Task**: `Produce a market research report`
   - **Budget**: `$60`
   - **Deadline**: `24 hours`
2. **Execute Decision**: Click **Run PACT Agent**.
3. **Inspect Selection**: Observe that PACT selects **ResearchAgent-B** ($55, 76/100 reputation) over the cheaper **ResearchAgent-A** ($40, 42/100 reputation).
4. **Examine Evidence**: Check the **Memory Evidence** panel to view the recalled historical records (e.g., Agent A's prior 14-hour delay).
5. **Toggle Cold Start**: Check **Simulate Cold Start (Memory OFF)** and re-run. Observe how the decision flips to **ResearchAgent-A** ($40), illustrating the load-bearing effect of memory.
6. **Review Escrow Action**: Inspect the prepared **Base Sepolia Escrow** payload locking funds across milestones.

---

## 8. API Reference

### `POST /api/pact/agent`

Evaluates a task against available agent candidates using Sibyl Memory and returns the optimal selection, risk assessment, payment strategy, and prepared Base Sepolia escrow payload.

#### Request Example
```bash
curl -X POST http://localhost:3000/api/pact/agent \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Produce a market research report",
    "budget": 60,
    "deadlineHours": 24,
    "simulateNoMemory": false
  }'
```

#### Response Example
```json
{
  "success": true,
  "decision": {
    "task": "Produce a market research report",
    "budget": 60,
    "deadlineHours": 24,
    "selectedCounterparty": "ResearchAgent-B",
    "reputation": 76,
    "riskLevel": "LOW",
    "price": 55,
    "paymentStrategy": "MILESTONE_2",
    "paymentTerms": {
      "strategy": "MILESTONE_2",
      "milestoneCount": 2,
      "milestones": [
        { "name": "Initial Deposit (50%)", "percentage": 50, "amount": 27.5 },
        { "name": "Final Delivery (50%)", "percentage": 50, "amount": 27.5 }
      ],
      "summary": "2 Milestones: 50% upfront ($27.50), 50% upon delivery ($27.50)"
    },
    "reasoning": "ResearchAgent-B ($55) was selected over ResearchAgent-A ($40) due to reliable historical performance. Historical records in Sibyl Memory verify 8 on-time completions with an average quality score of 8.8/10.",
    "whySection": {
      "summary": "PACT analyzed 3 available agents using Sibyl Memory and selected ResearchAgent-B.",
      "winnerRationale": "ResearchAgent-B ($55) was selected over ResearchAgent-A ($40) due to reliable historical performance.",
      "comparisonPoints": [
        "ResearchAgent-A ($40) is cheaper by $15, but carries HIGH RISK (42/100 reputation score from a previous 14-hour delay).",
        "ResearchAgent-C ($85) is rated 94/100, but exceeds the $60 task budget by $25."
      ],
      "alternativesAnalysis": [
        {
          "name": "ResearchAgent-A",
          "price": 40,
          "reputation": 42,
          "risk": "HIGH",
          "status": "REJECTED_HIGH_RISK_ALTERNATIVE",
          "reason": "Cheapest candidate ($40), but carries HIGH RISK (42/100) due to 14.0h past delay and 6.0/10 quality."
        },
        {
          "name": "ResearchAgent-C",
          "price": 85,
          "reputation": 94,
          "risk": "LOW",
          "status": "REJECTED_OVER_BUDGET",
          "reason": "Exceeds $60 budget by $25 (quote: $85)."
        }
      ]
    },
    "preparedEscrowAction": {
      "action": "PREPARE_ESCROW",
      "network": "Base Sepolia",
      "chainId": 84532,
      "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      "beneficiaryAddress": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "counterpartyName": "ResearchAgent-B",
      "totalAmount": 55,
      "currency": "USD (0.000002 ETH/USD scale)",
      "milestones": [
        { "name": "Initial Deposit (50%)", "percentage": 50, "amount": 27.5 },
        { "name": "Final Delivery (50%)", "percentage": 50, "amount": 27.5 }
      ],
      "ethEquivalent": "0.000110 ETH",
      "readyToBroadcast": true
    },
    "isColdStart": false,
    "memorySimulatedOff": false
  }
}
```

---

## 9. Base Sepolia Escrow Integration

PACT bridges off-chain memory with on-chain financial settlement:
- **Contract**: [`contracts/PACTEscrow.sol`](file:///Users/mikasa05/pact/contracts/PACTEscrow.sol)
- **Network**: Base Sepolia (Chain ID: `84532`)
- **Escrow Action Preparation**: PACT prepares the complete structured escrow payload (milestone splits, beneficiary wallet, ETH scaling) ready for transaction broadcast on Base Sepolia.
- **Contract Architecture**:
  - `createEscrow`: Creates and atomically funds a multi-milestone escrow.
  - `releaseMilestone`: Allows payer to disburse specific milestones upon verified completion.
  - `disputeEscrow`: Flags an escrow in dispute to prevent premature funds release.

*(Note: In development and testing modes, PACT prepares and formats the structured escrow payload for Base Sepolia; transactions can be signed via connected testnet wallets without making unverified mainnet claims.)*

---

## 10. Verification & Test Suite

All test suites and production build checks pass:

```bash
# Run unit & integration test suites
npm test
```
```
====================================================
       PACT CORE & SIBYL INTEGRATION TEST SUITE     
====================================================
17 PASSED, 0 FAILED

====================================================
       PACT AGENT WORKFLOW TEST SUITE (PHASE 5)     
====================================================
10 PASSED, 0 FAILED

Total: 27/27 tests passed
```

```bash
# Run Foundry smart contract tests
npm run test:contracts
```
```
Ran 8 tests for contracts/test/PACTEscrow.t.sol:PACTEscrowTest
[PASS] test_CreateAndFundEscrow3Milestones()
[PASS] test_CreateUnfundedAndFundLater()
[PASS] test_ReleaseMilestonesSequentially()
[PASS] test_RevertWhen_DoubleReleasingMilestone()
[PASS] test_RevertWhen_FundingMismatch()
[PASS] test_RevertWhen_NonPayerReleasesMilestone()
[PASS] test_RevertWhen_ZeroAddressBeneficiary()
[PASS] test_RevertWhen_ZeroMilestonesOrZeroAmount()
Suite result: ok. 8 passed; 0 failed; 0 skipped
```

```bash
# Verify production build
npm run build
```
```
✓ Compiled successfully
✓ Generating static pages (19/19)
✓ Finalizing page optimization
```

---

## 11. Tech Stack

- **Framework**: Next.js 16 (Turbopack, App Router)
- **Language**: TypeScript / React 19
- **Long-Term Memory**: Sibyl Memory (`sibyl-memory-cli`, Python bridge)
- **Storage Layer**: SQLite with FTS5 full-text indexing via Sibyl
- **Smart Contracts**: Solidity `^0.8.20`
- **Contract Tooling**: Foundry (`forge test`)
- **Target Network**: Base Sepolia (Chain ID: `84532`)

---

## 12. Security & Secrets Management

- **Environment Isolation**: All sensitive private keys and RPC credentials are kept strictly out of git via `.gitignore`.
- **Configuration Templates**: [`.env.example`](file:///Users/mikasa05/pact/.env.example) contains safe placeholders for local testing and configuration.
- **Smart Contract Safety**: `PACTEscrow.sol` enforces the Checks-Effects-Interactions pattern, non-reentrancy modifiers, zero-address checks, and strict caller authorization.
- **Testnet Scope**: Blockchain operations are strictly scoped to the Base Sepolia testnet.
