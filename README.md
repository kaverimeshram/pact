# PACT: Persistent Agent Commitment Tracker

> **A memory-backed reputation system for AI agents powered by Sibyl Memory.**

Built for the **Sibyl Labs Hackathon 2026**.

---

## What it does

**PACT** tracks AI agent commitments, deadlines, and delivery outcomes in persistent long-term storage (**Sibyl Memory**). It ensures that past performance (e.g. delivery delays, quality scores, broken promises, or dispute records) directly changes future economic decisions (such as requiring milestone payments and withholding upfront disbursements for high-risk counterparties) across fresh, decoupled agent sessions.

---

## The Problem

Autonomous AI agents frequently hire and negotiate with other AI agents or automated service providers. However, standard LLM sessions are stateless:

1. **A fresh agent session starts completely blind**: It does not remember whether a counterparty kept or broke its commitments yesterday.
2. **Untrusted counterparties exploit amnesia**: An agent that promises a 24-hour delivery but takes 38 hours with substandard quality is treated identically to a brand-new, high-trust provider in subsequent sessions.
3. **Financial loss**: The hiring agent blindly pays 100% upfront again, repeating the same counterparty failure.

---

## The Solution

PACT connects agent negotiations to **Sibyl Memory**:

- **Session A**: Records promised deadlines and logs the actual outcome (e.g. 14 hours late, 6/10 quality score) into Sibyl Memory.
- **Persistent Storage**: Sibyl persists both structured entities (`counterparties`, `commitments`, `outcomes`) and COLD-tier journal events in SQLite FTS5 store (`~/.sibyl-memory/memory.db`).
- **Fresh Session B**: A brand-new session with **zero local conversational state** queries Sibyl Memory, recalls the counterparty's historical delay and quality score, deterministic mathematical scoring calculates reliability at **42/100 (HIGH RISK)**, and PACT enforces **3 milestone payments with 0% full upfront disbursement** on new tasks.

$$\text{MEMORY} \longrightarrow \text{CHANGES THE DECISION}$$

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
  Payment Strategy (e.g. 3 Milestones / Escrow)
           ↓
Contract Execution & Base Escrow (lib/base.ts)
           ↓
   Delivery Outcome (Delay, Quality, Success)
           ↓
   Sibyl Persistence (Entities & COLD Journal)
```

---

## Memory Implementation

The Sibyl integration is located in:

- **[`scripts/sibyl_bridge.py`](file:///Users/mikasa05/pact/scripts/sibyl_bridge.py)**: Python bridge directly executing the official `sibyl_memory_client.MemoryClient` with local SQLite storage (`~/.sibyl-memory/memory.db`).
- **[`lib/memory/sibyl.ts`](file:///Users/mikasa05/pact/lib/memory/sibyl.ts)**: Core TypeScript module exposing:
  - `persistCounterparty(counterparty)`: Writes entity under `counterparties` category.
  - `persistCommitment(commitment)`: Writes entity under `commitments` category.
  - `persistOutcome(outcome)`: Writes outcome entity and appends a COLD-tier journal event.
  - `recallCounterparty(name)`: Exact entity retrieval from Sibyl store.
  - `recallRelevantHistory(query)`: FTS5 multi-tier search across entities, state, and journal events.
  - `readJournalEvents(limit)`: Reads sequential journal logs with evaluated/acted/forward payloads.
- **[`lib/reputation.ts`](file:///Users/mikasa05/pact/lib/reputation.ts)**: Deterministic mathematical scoring engine calculating reliability (0–100), risk tiers (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`, `UNKNOWN`), and milestone disbursements.
- **[`lib/decision-engine.ts`](file:///Users/mikasa05/pact/lib/decision-engine.ts)**: Evaluates incoming tasks against recalled memory and outputs structured decisions with causal evidence.

---

## Fresh Session & Memory Differential Demo

### 1. With Memory (Session B Recalls Session A)
- **Candidate**: `ResearchAgent-A`
- **Recalled History**: 14 hours late delivery, 6/10 quality score.
- **Reliability Score**: `42/100`
- **Risk Level**: `HIGH RISK`
- **Decision**: **3 MILESTONES** ($10 upfront / 20%, $20 milestone 1 / 40%, $20 final verification / 40%). Full upfront payment denied.

### 2. Without Memory (Simulate No Memory / Cold Start)
- **Candidate**: `ResearchAgent-A`
- **Recalled History**: *None (Memory recall disabled)*
- **Reliability Score**: `50/100` (Baseline)
- **Risk Level**: `UNKNOWN / COLD START`
- **Decision**: **COLD-START TERMS** (30% initial deposit, 70% settlement).

---

## Base Sepolia Integration

PACT includes an on-chain escrow binding module in **[`lib/base.ts`](file:///Users/mikasa05/pact/lib/base.ts)**:
- Connects to **Base Sepolia** (`https://sepolia.base.org`).
- Encodes cryptographic commitment data (`commitmentId`, `counterparty`, `strategy`) in the transaction payload.
- Returns verified on-chain transaction hashes viewable on [BaseScan Sepolia](https://sepolia.basescan.org/).

---

## Setup & Running Locally

### Prerequisites
- Node.js `v20+` (v25 supported)
- Python `3.10+` (v3.14 supported)
- `uv` package manager (`brew install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`)

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

4. **Run the Automated Test Suite:**
   ```bash
   npm test
   ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

```env
# Sibyl Memory Database Configuration
SIBYL_DB_PATH=~/.sibyl-memory/memory.db

# Base Sepolia Network Configuration (Optional for live on-chain escrow)
BASE_RPC_URL=https://sepolia.base.org
BASE_PRIVATE_KEY=
```

---

## 2–3 Minute Judging Demo Script

1. **Dashboard Overview (0:00 - 0:30)**:
   - Point to the **Sibyl Memory: Connected** status indicator.
   - Explain the core premise: AI agents have amnesia across sessions; PACT gives them persistent memory of counterparty commitments.
2. **Trigger Guided Demo (0:30 - 1:30)**:
   - Navigate to the **Guided Demo** tab.
   - Click **Step 1**: Creates commitment for `ResearchAgent-A` (24h deadline, 8/10 quality, $50).
   - Click **Step 2**: Records bad outcome (38h delivery, 14h late, 6/10 quality).
   - Click **Step 4**: Clicks **Start Fresh Session** (demonstrates session ID changing with zero local memory).
   - Click **Step 6 & 7**: PACT queries Sibyl Memory, recalls the 14h delay, and enforces a **3-Milestone Payment Strategy** ($10 / $20 / $20) with **HIGH RISK (42/100)**.
3. **Simulate No Memory Comparison (1:30 - 2:00)**:
   - Show the side-by-side card comparing the decision **WITH MEMORY** vs **WITHOUT MEMORY**.
   - Show that without memory, the agent blindly applies standard terms.
4. **Sibyl Memory Audit (2:00 - 2:30)**:
   - Open **Sibyl Memory** tab.
   - Show raw persisted entities and execute an FTS5 search query (`ResearchAgent-A`) returning matching entities and journal logs directly from `~/.sibyl-memory/memory.db`.
