# PolicyMint — Product Requirements Document

| Field | Value |
| :-- | :-- |
| **Version** | 1.4.2 |
| **Status** | DRAFT — Hackathon-Aligned Revision |
| **Created** | 2026-03-28 |
| **Owner** | Obaid Safi, Founding PM |
| **Last Updated** | 2026-04-06 |
| **Changelog** | v1.4.1 → v1.4.2: PRISM AI signal layer integrated as the official AI intelligence provider for the hackathon's AI trading agent requirement. FR-08 rewritten to replace rule-based momentum placeholder with PRISM API (`/signals`, `/risk`, `/resolve`) as the live AI signal source. PRISM SignalProvider added to P0 scope. Two new env vars added (`PRISM_API_KEY`, `PRISM_BASE_URL`). Open Question 9 closed. Alignment checklist updated with v1.4.2 column. Submission positioning updated to reference PRISM. No other sections changed. |

---

## Overview

PolicyMint is a **policy-protected autonomous trading agent** — not just a control plane. It executes on-chain trading strategies through Kraken CLI and the ERC-8004 Hackathon Risk Router while enforcing real-time policy guardrails (spend caps, venue allowlists, daily loss budgets) at every step. Every trade intent is signed with EIP-712, every policy decision emits a validation artifact to the ERC-8004 Validation Registry, and every safe execution cycle accrues on-chain reputation. It is not an alerting bot. It is not passive middleware. It is a **trustless trading agent with provable risk controls, powered by PRISM AI signals**.

---

## Problem Statement

AI agents can autonomously execute trades, manage capital, and coordinate DeFi workflows — but there is no standard mechanism that simultaneously enables execution and enforces verifiable risk boundaries. This gap is measurable: H1 2025 crypto theft reached $3.01 billion. Autonomous trading agents either execute without guardrails (high-performance, high-risk) or are gated behind passive policy engines that never trade (safe but inert). PolicyMint solves both sides: it executes real financial strategies while proving every risk check on-chain via ERC-8004 validation artifacts, making institutional-grade safe execution possible for the first time.

---

## Objective

Ship an MVP that:
1. Registers an autonomous agent identity on the shared ERC-8004 AgentRegistry
2. Executes a minimal AI-driven trading strategy via Kraken CLI (Kraken track) and/or ERC-8004 Risk Router (ERC-8004 track)
3. Enforces PolicyMint policy rules (venue allowlist, spend cap, daily loss budget) as a mandatory pre-flight gate before every trade execution
4. Emits EIP-712 signed validation artifacts and reputation signals to the ERC-8004 Validation Registry after every decision
5. Logs every decision to PostgreSQL and produces a live operator console showing PnL, policy events, and on-chain reputation score

---

## Target Personas

### Persona 1 — The Agent Builder

- **Role:** Developer building an AI agent that executes on-chain trades, payments, or swaps
- **Pain:** No library or SDK exists to enforce spending boundaries on agent wallets without building it from scratch
- **Goal:** Drop in a PolicyMint SDK call and have policy enforcement + ERC-8004 trust signal emission handled automatically

### Persona 2 — The DAO Ops Lead

- **Role:** Manages treasury automation for a DAO; authorizes bots to execute payroll, grants, or liquidity management
- **Pain:** Cannot delegate wallet authority to an agent without full financial risk exposure
- **Goal:** Set a daily loss cap and venue allowlist on each agent; see drawdown prevention value and on-chain reputation score in real time

### Persona 3 — The Compliance Officer (Web3 Fintech)

- **Role:** Responsible for audit trails and regulatory defensibility of automated transactions
- **Pain:** Agent transactions produce no structured, verifiable audit log
- **Goal:** Export a complete log of all policy decisions, EIP-712 signed intents, and block reasons per agent per period

### Persona 4 — The Hackathon Evaluator / Institutional Auditor

- **Role:** Judges or institutional partners assessing the safety and trustlessness of an autonomous trading system
- **Pain:** Cannot objectively verify that a trading agent operated within declared risk parameters during a competition window
- **Goal:** View a transparent, on-chain leaderboard showing PnL, Sharpe ratio, drawdown, and ERC-8004 validation score — all provably linked to a registered Agent Identity on the shared AgentRegistry

---

## Success Metrics (KPIs)

| Metric | Target | Measurement Tool |
| :-- | :-- | :-- |
| Policy engine latency (p99) | < 2 seconds | Sentry APM |
| False-positive block rate | < 3% (operator override rate on blocked decisions within 5 min) | Amplitude event log |
| **Drawdown prevention value** | ≥ 10% loss reduction vs. unprotected baseline agent | Backtested simulation + live sandbox PnL diff |
| **ERC-8004 reputation score** | ≥ +50 reputation points by end of competition window | ERC-8004 ReputationRegistry on Ethereum Sepolia |
| **Sharpe ratio** | > 1.0 over competition period | lablab.ai leaderboard |
| Agent wallets under management | 50 by end of Month 2 | PostgreSQL `agents` count |
| SDK integration time (new developer) | < 30 minutes | Onboarding survey |
| Weekly Active Operators | 20 by end of Month 3 | Amplitude DAU/WAU |
| On-chain record emission success rate | > 99% | Chain indexer + Sentry |
| **EIP-712 intent signing success rate** | > 99.5% | ValidationRegistry event log |

---

## Shared Hackathon Infrastructure

All five contracts are pre-deployed on **Ethereum Sepolia (chainId 11155111)**, verified on Etherscan, and are the **only** addresses the leaderboard reads from. Do not deploy custom versions of these contracts.

| Contract | Address |
| :-- | :-- |
| AgentRegistry | `0x97b07dDc405B0c28B17559aFFE63BdB3632d0ca3` |
| HackathonVault | `0x0E7CD8ef9743FEcf94f9103033a044caBD45fC90` |
| RiskRouter | `0xd6A6952545FF6E6E6681c2d15C59f9EB8F40FdBC` |
| ReputationRegistry | `0x423a9904e39537a9997fbaF0f220d79D7d545763` |
| ValidationRegistry | `0x92bF63E5C7Ac6980f237a7164Ab413BE226187F1` |

**Reference:** https://github.com/Stephen-Kimoi/ai-trading-agent-template/blob/main/SHARED_CONTRACTS.md

**Agent onboarding sequence:**
1. Call `AgentRegistry.registerAgent()` → receive `agentId` (uint256) — store in `agents.erc8004_token_id`
2. Call `HackathonVault.claimAllocation(agentId)` → 0.05 ETH sandbox capital allocated instantly
3. Route all DEX trades through `RiskRouter`
4. Post checkpoints to `ValidationRegistry` after each policy decision
5. Reputation accumulates in `ReputationRegistry` automatically

---

## Scope

### P0 — Must-Have for Launch (Hackathon Submission)

- [ ] **ERC-8004 Agent Identity registration** — Call `AgentRegistry.registerAgent()` on the shared Ethereum Sepolia contract; store returned `agentId` (uint256) in `agents.erc8004_token_id`
- [ ] **UUID v7 internal identity** retained as PostgreSQL primary key (maps to shared AgentRegistry agentId via `erc8004_token_id` column)
- [ ] **HackathonVault capital claim** — Call `claimAllocation(agentId)` on `HackathonVault` at `0x0E7CD8ef9743FEcf94f9103033a044caBD45fC90` to receive 0.05 ETH sandbox capital
- [ ] **EIP-712 typed data signatures** for all trade intents and attestations (required by ERC-8004 challenge)
- [ ] **EIP-1271 support** for smart-contract wallet verification
- [ ] **EIP-155 chain-id binding** on all signed payloads (chainId: 11155111)
- [ ] **PRISM SignalProvider integration** — Strategy module calls `GET /signals/{symbol}` and `GET /risk/{symbol}` on each tick to generate AI-scored TradeIntents; asset symbols normalized via `GET /resolve/{asset}`; PRISM API key configured via `PRISM_API_KEY` env var *(Added v1.4.2)*
- [ ] **Minimal strategy module** — AI-driven momentum or rebalancing strategy that generates TradeIntents programmatically using PRISM AI signals as the primary source and Kraken Public REST API / WebSockets and/or Kraken CLI market data as supplementary price feed
- [ ] **Kraken CLI execution adapter** — Agent submits buy/sell orders via Kraken CLI; PolicyMint pre-flight gates every order before CLI execution
- [ ] **Hackathon Capital Sandbox integration** — Agent claims sandbox capital from `HackathonVault`; all DEX execution routed through `RiskRouter` at `0xd6A6952545FF6E6E6681c2d15C59f9EB8F40FdBC`
- [ ] Policy configuration: venue allowlist, per-transaction spending cap, daily loss budget
- [ ] Intent classifier: maps proposed agent actions to approved policy classes
- [ ] Policy engine: real-time evaluate → sign or block gate
- [ ] Block reason generation: human-readable explanation returned to agent and operator
- [ ] **ERC-8004 ValidationRegistry emission** — Every allow/block decision emits an EIP-712 validation artifact to `ValidationRegistry` at `0x92bF63E5C7Ac6980f237a7164Ab413BE226187F1`
- [ ] **ERC-8004 ReputationRegistry hook** — Each safe execution cycle emits a positive trust signal; policy violations emit a negative signal; both feed the agent's on-chain reputation score via `ReputationRegistry` at `0x423a9904e39537a9997fbaF0f220d79D7d545763`
- [ ] Audit log: every policy decision written to PostgreSQL with full context
- [ ] Operator console: single-page app showing live agent activity, block events, **PnL**, **reputation score**, and **drawdown chart**
- [ ] Simulate screen: operator manually proposes an action and sees allow/block result live
- [ ] TypeScript/Node.js SDK (npm package, alpha)
- [ ] API key authentication for agent SDK calls
- [ ] **Surge early.surge.xyz project registration** — Required for prize eligibility

### P1 — Fast Follows (Post-Hackathon / Post-Launch)

- [ ] Optional external multi-asset signals integration
- [ ] TEE-backed attestations or verifiable execution proofs (TEE oracle / zkML validation) — optional enhancement per challenge PDF
- [ ] Off-chain indexer or subgraph for discovery dashboard and public leaderboard
- [ ] Policy template marketplace (pre-built rulesets per use case category)
- [ ] Slack and webhook alerting on block events
- [ ] Multi-agent authorization (Agent A delegates to Agent B up to $X)
- [ ] Anomaly score display in operator console
- [ ] Audit log CSV/JSON export
- [ ] Role-based access control for multi-member operator teams
- [ ] Aerodrome Finance liquidity pool integration for yield/LP optimization strategies

### Explicitly Out of Scope (v1.4)

- Cross-chain bridging policy enforcement
- Human multisig replacement or co-signing
- Fiat off-ramp controls
- Mobile application
- Support for non-EVM chains (beyond Kraken CEX track)
- Zero-knowledge proofs of policy compliance (zkML is P1 optional, not P0)
- Self-deployment of any ERC-8004 registry contracts

---

## Functional Requirements

### FR-01: Agent Registration (Updated v1.4.1)

- An operator must be able to register an agent by providing: agent name, deployer wallet address, metadata URI, target chain ID, and agent strategy type
- Each registered agent receives:
  - A unique `agent_id` (UUID v7) as the internal PostgreSQL primary key
  - An API key scoped to that agent
  - **An `agentId` (uint256) returned by `AgentRegistry.registerAgent()` on Ethereum Sepolia** — stored in `agents.erc8004_token_id`. No custom ERC-721 deployment required; the shared AgentRegistry is the canonical identity registry.
- The `agentId` from AgentRegistry must be stored in the `agents` table in the `erc8004_token_id` column alongside UUID v7
- Registration must be available via REST API and via the TypeScript SDK

#### Two-Wallet Architecture (Added v1.4.1)

PolicyMint requires **two separate wallets** per the official SHARED_CONTRACTS.md specification:

| Wallet | Env Var | Role |
| :-- | :-- | :-- |
| `operatorWallet` | `PRIVATE_KEY` | Owns the ERC-721 agent identity on AgentRegistry, pays gas for all on-chain calls |
| `agentWallet` | `AGENT_WALLET_PRIVATE_KEY` | Signs all `TradeIntent` EIP-712 payloads submitted to the RiskRouter |

These must never be the same address. The `agentWallet` address is embedded in every on-chain `TradeIntent` struct.

#### `AgentRegistry.register()` Call Spec (Added v1.4.1)

The full function signature is:

```solidity
function register(
  address agentWallet,       // agentWallet address (NOT operatorWallet)
  string name,               // "PolicyMint"
  string description,        // "Policy-protected autonomous trading agent with provable risk controls."
  string[] capabilities,     // ["trading", "eip712-signing", "policy-enforcement"]
  string agentURI            // data: base64 URI of agent metadata JSON (see below)
) external returns (uint256 agentId)
```

**agentURI** must be a base64 `data:` URI encoding the following JSON (fastest for hackathon — zero hosting required):

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "PolicyMint",
  "description": "Policy-protected autonomous trading agent with provable risk controls. Enforces spend caps, venue allowlists, and daily loss budgets via EIP-712 signed validation artifacts on every trade intent.",
  "services": [{ "name": "web", "endpoint": "https://your-vercel-frontend-url.vercel.app" }],
  "active": true
}
```

> ⚠️ **REMAINING** — Two new env vars must be added: `AGENT_WALLET_PRIVATE_KEY` (agentWallet signer) and `OPERATOR_WALLET_PRIVATE_KEY` (operatorWallet gas payer). Backend registration service must be updated to pass all five `register()` arguments. The `agentURI` base64 encoding must be generated before Step 3 begins.

---

### FR-02: Policy Configuration

- An operator must be able to attach one or more policies to a registered agent
- Supported policy types at launch: `venue_allowlist`, `spend_cap_per_tx`, `daily_loss_budget`
- Policies must be activatable and deactivatable without deleting historical records
- Policy parameters must be stored as JSONB to allow type extensibility

---

### FR-03: Intent Evaluation (Updated v1.4.1)

- An agent must be able to submit a proposed transaction intent to the policy engine endpoint
- The intent must conform to this schema and be **EIP-712 typed** for on-chain attestation

#### Internal PolicyMint TradeIntent (Policy Engine Input)

This is the schema submitted to `POST /v1/evaluate` by the strategy module:

```json
{
  "action_type": "swap | transfer | bridge | trade | custom",
  "venue": "string (e.g. uniswap-v3, kraken-spot, 0x-contract-address)",
  "amount": "string (wei or token units)",
  "token_in": "string (address or symbol)",
  "token_out": "string (optional)",
  "eip712_domain": {
    "name": "PolicyMint",
    "version": "1",
    "chainId": 11155111,
    "verifyingContract": "0x92bF63E5C7Ac6980f237a7164Ab413BE226187F1"
  },
  "params": "object (arbitrary key-value for extensibility)"
}
```

#### On-Chain RiskRouter TradeIntent (Different Object — Added v1.4.1)

The RiskRouter's on-chain `TradeIntent` struct has a **different schema** from the internal policy engine intent. The backend must **map** the internal intent to this struct before submitting:

```solidity
struct TradeIntent {
  uint256 agentId;          // from agents.erc8004_token_id
  address agentWallet;      // AGENT_WALLET_PRIVATE_KEY address
  string pair;              // e.g. "BTC/USD"
  string action;            // "buy" | "sell"
  uint256 amountUsdScaled;  // amount in USD * 1e6 (e.g. $100 = 100_000_000)
  uint256 maxSlippageBps;   // max slippage in basis points (e.g. 50 = 0.5%)
  uint256 nonce;            // monotonic nonce per agentWallet
  uint256 deadline;         // block.timestamp + buffer
}
```

The backend `evaluate → execute` pipeline must:
1. Accept the internal `TradeIntent` format at `/v1/evaluate`
2. Run all policy rule evaluations against the internal format
3. If `allow`: map the internal intent to the RiskRouter `TradeIntent` struct and sign it with `agentWallet` before submitting to the RiskRouter

#### RiskRouter Hard Limits (Added v1.4.1)

The RiskRouter enforces these limits on **every agent** — PolicyMint policy rules must be calibrated **below** these ceilings or the RiskRouter will silently reject the trade:

| Hard Limit | Value | PolicyMint Policy Ceiling |
| :-- | :-- | :-- |
| Max position size | $500 USD per trade | `spend_cap_per_tx` ≤ $450 USD |
| Max trades per hour | 10 | Strategy loop rate ≤ 8/hour |
| Max drawdown | 5% | `daily_loss_budget` ≤ 4% |

> ⚠️ **REMAINING** — Backend policy rule defaults must be updated to enforce the ceilings above. The internal-to-RiskRouter TradeIntent mapping function must be implemented. `nonce` tracking per `agentWallet` must be added to the DB schema (`agent_nonces` table or `agents.last_nonce` column).

- The engine must evaluate the intent against all active policies for that agent
- Response must include: `result` (allow | block), `reason` (if block), `policy_id`, `evaluation_id`, and **`eip712_signed_intent`** (the signed payload for submission to ValidationRegistry)
- For `allow` decisions, the agent must use the returned `eip712_signed_intent` as the authorization proof when calling the RiskRouter or Kraken CLI

---

### FR-04: On-Chain Validation Record (Updated v1.4.1)

- Every `allow` or `block` decision must emit a validation artifact to the **ERC-8004 ValidationRegistry** at `0x92bF63E5C7Ac6980f237a7164Ab413BE226187F1` on Ethereum Sepolia
- The event payload must include: `agentId` (from AgentRegistry), `evaluation_id`, `result`, `strategy checkpoint hash`, and `timestamp`
- The emitted transaction hash must be stored in the `validation_records` table (`tx_hash` column)
- Etherscan-visible transaction confirmation is the audit trail — no separate fallback contract needed

#### Attestation Score Policy (Added v1.4.1)

The `postEIP712Attestation()` call requires a self-reported `score` (0–100). PolicyMint scoring policy:

| Decision | Score | Rationale |
| :-- | :-- | :-- |
| `allow` → executed → confirmed on-chain | 95 | Full cycle complete, policy compliant |
| `allow` → executed → unconfirmed / pending | 70 | Execution submitted, outcome pending |
| `block` → policy violated | 40 | Policy enforced correctly, but violation occurred |
| `block` → intent malformed | 20 | Invalid intent rejected at intake |

> ⚠️ **REMAINING** — `postEIP712Attestation()` call in the backend must be updated to pass the `score` argument using the table above. Score selection logic must be added to the ValidationRegistry emission service.

---

### FR-05: Operator Console (Updated v1.4.1)

- The console must be deployed on **Vercel Free Tier**
- Must display a real-time feed of policy decisions for all registered agents
- Each decision card: agent name, action attempted, result, rule violated (if block), timestamp, on-chain tx hash (Etherscan Sepolia link)
- **PnL chart** showing cumulative performance over competition window
- **Reputation score panel** showing current ERC-8004 reputation score and trend (read from ReputationRegistry)
- **Drawdown vs. baseline comparison** — live chart comparing PolicyMint-protected PnL vs. simulated unprotected baseline
- Simulate screen must return a result within 3 seconds

#### simulateIntent() On-Chain Dry Run (Added v1.4.1)

The Simulate Screen must call the RiskRouter's read-only `simulateIntent()` function **before** posting to the backend policy engine. This provides a free, on-chain pre-validation layer:

```solidity
function simulateIntent(
  uint256 agentId,
  string pair,
  string action,
  uint256 amountUsdScaled
) external view returns (bool valid, string memory reason)
```

**Simulate Screen flow (updated):**
1. Operator enters proposed action in the console UI
2. Frontend calls `simulateIntent()` via read-only RPC (no gas) → displays on-chain validity check result
3. Frontend POSTs the intent to `POST /v1/evaluate` (backend policy engine)
4. Console displays combined result: on-chain RiskRouter verdict + PolicyMint policy verdict

> ⚠️ **REMAINING** — Frontend Simulate Screen must add the `simulateIntent()` viem read call before the backend POST. UI must display both verdicts side-by-side. No backend changes required — this is frontend-only.

---

### FR-06: Kraken CLI Execution Adapter

- The agent must interface with Kraken CLI (zero-dependency Rust binary with MCP server) for CEX-side trade execution
- Before each Kraken CLI execution call, the PolicyMint policy engine must evaluate the intent and return a signed authorization
- If `block`, the CLI call must not proceed and the block reason must be logged
- If `allow`, the CLI call proceeds using the returned EIP-712 signed intent as the execution proof
- A read-only Kraken API key must be configurable for leaderboard verification by lablab.ai

---

### FR-07: Hackathon Capital Sandbox Integration (Updated v1.4)

- The agent must call `HackathonVault.claimAllocation(agentId)` at `0x0E7CD8ef9743FEcf94f9103033a044caBD45fC90` on initialization to receive 0.05 ETH sandbox capital
- All DEX trades must be routed exclusively through `RiskRouter` at `0xd6A6952545FF6E6E6681c2d15C59f9EB8F40FdBC` — no direct RPC calls for execution
- The agent must track stablecoin-denominated PnL from the claimed allocation
- Position size limits, max leverage, whitelisted markets, and daily loss limits enforced by the RiskRouter must be mapped to PolicyMint policy types

---

### FR-08: Strategy Module (Updated v1.4.2)

- The agent must include a minimal AI-driven trading strategy that programmatically generates `TradeIntent` objects
- **Primary AI signal source: PRISM API** (`api.prismapi.ai`). On each strategy tick, the agent must:
  1. Call `GET /resolve/{asset}` → normalize the target symbol to a canonical PRISM identity before any downstream calls
  2. Call `GET /signals/{symbol}` → receive an AI-generated signal (bullish / bearish / neutral) and confidence score from PRISM's 20+ source aggregation layer
  3. Call `GET /risk/{symbol}` → receive real-time volatility metrics and drawdown risk score to dynamically size the position
  4. Compute `amountUsdScaled` from the PRISM risk score: higher volatility → smaller position, bounded by `spend_cap_per_tx` policy ceiling (≤ $450 USD)
  5. Generate a `TradeIntent` using the PRISM signal direction as the `action` ("buy" | "sell") and the risk-adjusted size as `amountUsdScaled`
  6. Submit to PolicyMint policy engine → execute if allowed → emit ValidationRegistry artifact
- **Supplementary price feed:** Kraken Public REST API / WebSockets and/or Kraken CLI market data may be used as a real-time price confirmation layer alongside PRISM signals
- Strategy logic must be modular and swappable behind a `SignalProvider` interface — PRISM is the default implementation; any other AI model or signal source can replace it post-hackathon without changing the strategy loop
- The persistent strategy loop and backend API must run on **Render Free Web Service**

#### PRISM API Reference (Added v1.4.2)

| Endpoint | Purpose | Used In |
| :-- | :-- | :-- |
| `GET /resolve/{asset}` | Canonical asset identity resolution across crypto, equities, forex | Symbol normalization before every tick |
| `GET /signals/{symbol}` | AI-generated signal score: direction + confidence | Trade direction decision |
| `GET /risk/{symbol}` | Volatility metrics + drawdown risk score | Dynamic position sizing |
| `GET /crypto/{symbol}/price` | Real-time price (optional supplementary) | Price confirmation layer |

> **Setup:** Sign up at [prismapi.ai](https://prismapi.ai), redeem code `LABLAB` for $10 in free API credits (~15K calls). Create key (`prism_sk_...`) and set as `PRISM_API_KEY` env var.

---

### FR-09: ERC-8004 Reputation Hook (Updated v1.4.1)

- After each completed trading cycle (allow → execute → confirm), the agent must emit a **positive trust signal** to `ReputationRegistry` at `0x423a9904e39537a9997fbaF0f220d79D7d545763` on Ethereum Sepolia
- After each policy block event, the agent must emit a negative trust signal
- Reputation score must be queryable from the operator console by reading directly from the on-chain ReputationRegistry
- Reputation accumulation must be tied to objective outcomes: execution within declared policy bounds, PnL relative to drawdown limits, validation score from validators

#### `submitFeedback()` Call Spec (Added v1.4.1)

Reputation is **not automatic**. The backend must explicitly call `submitFeedback()` after every trade cycle:

```solidity
function submitFeedback(
  uint256 agentId,      // from agents.erc8004_token_id
  uint8 score,          // 0–100 (see enum mapping below)
  bytes32 outcomeRef,   // keccak256 of evaluation_id
  string comment,       // human-readable outcome description
  uint8 feedbackType    // see enum below
) external
```

**feedbackType enum mapping for PolicyMint events:**

| PolicyMint Event | feedbackType | score | comment |
| :-- | :-- | :-- | :-- |
| `allow` → execute → confirmed | `1` (POSITIVE) | 80 | "Trade executed within policy bounds" |
| `allow` → execute → failed | `2` (NEUTRAL) | 50 | "Trade allowed but execution failed" |
| `block` → policy violation | `3` (NEGATIVE) | 20 | "Trade blocked: {policy_rule} violated" |
| `block` → RiskRouter rejection | `3` (NEGATIVE) | 10 | "Trade blocked: RiskRouter hard limit exceeded" |

> ⚠️ **REMAINING** — FR-09 backend service must be rewritten from "automatic hook" assumption to explicit `submitFeedback()` calls. `outcomeRef` must be computed as `keccak256(evaluation_id)`. `feedbackType` enum must match the ReputationRegistry contract's actual enum values — **verify against Etherscan ABI before implementation**.

---

## Non-Functional Requirements

- **Latency:** Policy evaluation p99 < 2s under normal load
- **Concurrent intent evaluations:** Up to 10 per second per agent under normal load (p99 latency < 2s)
- **Availability:** API target 99.5% uptime (acceptable for v1 beta)
- **Security:** No agent API key stored in plaintext; all keys hashed (bcrypt); HTTPS only
- **Operator console authentication:** Web3 only via SIWE (Sign-In With Ethereum). Agents use scoped API keys. No passwords stored.
- **Data retention:** Audit logs retained for minimum 90 days
- **Chain:** Ethereum Sepolia (chainId 11155111) for hackathon submission; Ethereum Mainnet for production launch
- **Compliance:** All transaction data stored in Supabase PostgreSQL; no PII collected from agents
- **Observability:** Sentry for error tracking and APM; Pino structured logs with Render native log tailing
- **Infrastructure:** Option A — Split Stack: Render Free Web Service for backend/agent loop, Vercel Free Tier for frontend, Supabase Free Tier for PostgreSQL
- **RPC:** Alchemy Free Tier as primary provider (Ethereum Sepolia endpoint); Ethereum Sepolia Public RPC (`https://rpc.sepolia.org`) as fallback
- **EIP Standards Compliance:** All signed payloads must conform to EIP-712 (typed data), EIP-1271 (smart contract wallet support), EIP-155 (chain-id binding on chainId 11155111)

---

## Hackathon Prize Targeting

| Prize | Value | Strategy |
| :-- | :-- | :-- |
| **Best Compliance & Risk Guardrails** (Special Award) | $2,500 in $SURGE | Primary target — PolicyMint's native moat; demonstrate live on-chain policy enforcement with ERC-8004 validation artifacts |
| **Best Risk-Adjusted Return** (2nd Place) | $5,000 in $SURGE | Secondary target — compete on Sharpe ratio + drawdown control, not raw PnL |
| **Best Trustless Trading Agent** (1st Place) | $10,000 in $SURGE | Stretch target — achievable only with combined Kraken CLI + ERC-8004 submission |
| **Best Validation & Trust Model** (3rd Place) | $2,500 in $SURGE | Fallback target — strong validation artifact output is a native strength |
| **Kraken Social Engagement** | $1,200–$300 | Parallel track — document "building the safety layer DeFi needs" narrative on X/Twitter tagging @krakenfx, @lablabai, @Surgexyz_ |
| **Kraken PnL** | $1,800–$450 | Parallel track — enter with Kraken CLI agent; not primary but low marginal effort for combined submission |

**Recommended submission positioning:** *"PolicyMint is the first trustless trading agent with provable risk controls — powered by PRISM AI signals, enforced by PolicyMint policy engine, and proven on-chain via ERC-8004."*

---

## Assumptions & Risks

| # | Assumption / Risk | Mitigation |
| :-- | :-- | :-- |
| 1 | Intent classifier can be trained on synthetic data for MVP | Rule-based classifier first; ML added in Sprint 2 iteration |
| ~~2~~ | ~~Base Sepolia RPC reliability could impact on-chain emission~~ | **RETIRED v1.4:** Chain is now Ethereum Sepolia. Use Alchemy Sepolia endpoint as primary; `https://rpc.sepolia.org` as fallback. |
| 3 | Agent builders will integrate SDK without hand-holding | Ship integration guide + working code example on day 1 of SDK release |
| 4 | Policy engine may be too strict, causing high false-positive blocks | Set conservative default thresholds; let operators tune per agent |
| ~~5~~ | ~~ERC-8004 registry contracts may have incomplete/unstable ABI at hackathon start~~ | **RETIRED v1.4:** All five contracts are deployed, verified, and ABI-readable on Etherscan Sepolia. |
| ~~6~~ | ~~Hackathon Capital Vault and Risk Router contract addresses may not be published until hackathon kickoff~~ | **RETIRED v1.4:** All addresses published. |
| 7 | Kraken CLI paper-trading sandbox may not reflect real market conditions | Use Kraken CLI local paper-trading sandbox for testing; switch to live read-only API key for leaderboard verification |
| 8 | Kraken public market data limits or transport issues could interrupt signal polling | Prefer WebSockets for live prices, back off REST polling, and cache short-lived market snapshots locally |
| 9 | ERC-8004 reputation scoring validators may not be active during hackathon window | Self-emit validation scores using the challenge-provided validator interface; document this as the submission's trust model |
| 10 | PRISM API credit exhaustion during hackathon window | Free tier provides ~15K calls; at ≤ 8 trades/hour that is ~750+ hours of runway. Cache `/resolve/` responses (TTL 1 hour) to reduce call count. |

---

## Open Questions

| # | Question | Resolution |
| :-- | :-- | :-- |
| 1 | Agent identity primary key | **Dual key: UUID v7 (internal DB) + AgentRegistry agentId uint256 (external on-chain). No replacement — additive.** |
| ~~2~~ | ~~On-chain validation record ABI~~ | **CLOSED v1.4:** Use ValidationRegistry at `0x92bF63E5C7Ac6980f237a7164Ab413BE226187F1`. ABI verified on Etherscan Sepolia. |
| 3 | Operator console auth | Web3 only via SIWE *(unchanged)* |
| ~~4~~ | ~~Which ERC-8004 network to deploy registries on?~~ | **CLOSED v1.4:** Ethereum Sepolia (chainId 11155111). Shared contracts are pre-deployed. No team deployment needed. |
| ~~5~~ | ~~Kraken CLI track vs. ERC-8004 track — enter one or both?~~ | **CLOSED v1.4:** Combined submission confirmed. |
| 6 | Kraken Public API / WebSockets vs. Kraken CLI market data for strategy signals? | **Use Kraken CLI market data where convenient for the Kraken track; use Kraken Public REST API / WebSockets as the default free signal source. Abstract both behind a common interface.** |
| 7 | EIP-1271 smart contract wallet — deploy custom or use existing? | **Use Safe (Gnosis Safe) as the agent's smart contract wallet for EIP-1271 compliance.** |
| **8** | **feedbackType enum values in ReputationRegistry** | **⚠️ REMAINING — Verify exact uint8 enum values from Etherscan Sepolia ABI before implementing FR-09 submitFeedback() calls.** |
| ~~9~~ | ~~AI signal source for strategy module~~ | **CLOSED v1.4.2:** PRISM API (`/signals`, `/risk`, `/resolve`) at `api.prismapi.ai`. Free tier + $10 credits via code `LABLAB`. Configured via `PRISM_API_KEY` env var. |

---

## Alignment Checklist vs. Challenge Requirements

| Challenge Requirement | PRD v1.3 Status | PRD v1.4 Status | PRD v1.4.1 Status | PRD v1.4.2 Status |
| :-- | :-- | :-- | :-- | :-- |
| Real financial function (trade/risk/yield/protect) | ✅ Active | ✅ Unchanged | ✅ Unchanged | ✅ Unchanged |
| Kraken CLI integration | ✅ FR-06 | ✅ Unchanged | ✅ Unchanged | ✅ Unchanged |
| ERC-8004 Identity Registry | ✅ FR-01 | ✅ Shared AgentRegistry | ✅ Two-wallet + full register() args added | ✅ Unchanged |
| EIP-712 typed data signatures | ✅ FR-03 | ✅ Unchanged | ✅ Internal vs. on-chain TradeIntent separated | ✅ Unchanged |
| EIP-1271 smart contract wallet support | ✅ NFR | ✅ Unchanged | ✅ Unchanged | ✅ Unchanged |
| EIP-155 chain-id binding | ✅ NFR | ✅ chainId 11155111 | ✅ Unchanged | ✅ Unchanged |
| Hackathon Capital Sandbox / Risk Router | ✅ FR-07 | ✅ Real addresses | ✅ Hard limits calibrated in FR-03 | ✅ Unchanged |
| ERC-8004 ValidationRegistry emission | ✅ FR-04 | ✅ Canonical address | ✅ Score policy defined | ✅ Unchanged |
| ReputationRegistry accumulation | ✅ FR-09 | ✅ Canonical address | ✅ submitFeedback() spec added | ✅ Unchanged |
| Validation artifacts (trade intents, risk checks) | ✅ EIP-712 | ✅ Unchanged | ✅ Unchanged | ✅ Unchanged |
| Risk-adjusted profitability / drawdown control | ✅ Console | ✅ Unchanged | ✅ simulateIntent() added to Simulate Screen | ✅ Unchanged |
| Surge project registration | ✅ P0 | ✅ Unchanged | ✅ Unchanged | ✅ Unchanged |
| **AI agent intelligence layer** | ❌ Missing | ❌ Missing | ❌ Missing | ✅ **PRISM API signals integrated — FR-08 updated** |

---

## Environment Variable Reference (Backend)

All environment variables required for the backend service on Render:

| Variable | Value | Notes |
| :-- | :-- | :-- |
| `DATABASE_URL` | Supabase pooled connection string | Required |
| `DIRECT_URL` | Supabase direct connection string | Required for Prisma migrations |
| `JWT_SECRET` | 64-char hex string | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ALCHEMY_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` | Ethereum Sepolia endpoint |
| `POLICY_SIGNER_PRIVATE_KEY` | `0x...` hex private key | Never log or expose |
| `OPERATOR_WALLET_PRIVATE_KEY` | `0x...` hex private key | Owns ERC-721, pays gas — added v1.4.1 |
| `AGENT_WALLET_PRIVATE_KEY` | `0x...` hex private key | Signs TradeIntents — added v1.4.1 |
| `PRISM_API_KEY` | `prism_sk_...` | PRISM AI signal source — added v1.4.2 |
| `PRISM_BASE_URL` | `https://api.prismapi.ai` | PRISM API base URL — added v1.4.2 |
| `CHAIN_ID` | `11155111` | Ethereum Sepolia |
| `NODE_ENV` | `production` | Set by Render automatically |
| `IDENTITY_REGISTRY_ADDRESS` | `0x97b07dDc405B0c28B17559aFFE63BdB3632d0ca3` | Shared AgentRegistry |
| `VALIDATION_REGISTRY_ADDRESS` | `0x92bF63E5C7Ac6980f237a7164Ab413BE226187F1` | Shared ValidationRegistry |
| `REPUTATION_REGISTRY_ADDRESS` | `0x423a9904e39537a9997fbaF0f220d79D7d545763` | Shared ReputationRegistry |
| `RISK_ROUTER_ADDRESS` | `0xd6A6952545FF6E6E6681c2d15C59f9EB8F40FdBC` | Shared RiskRouter |
| `HACKATHON_VAULT_ADDRESS` | `0x0E7CD8ef9743FEcf94f9103033a044caBD45fC90` | Shared HackathonVault |
| `SENTRY_DSN` | Sentry project DSN | Optional — observability |
| `KRAKEN_API_KEY` | Kraken read-only API key | Optional — leaderboard verification |
| `KRAKEN_API_SECRET` | Kraken API secret | Optional — leaderboard verification |

> ⚠️ **REMAINING** — Add `OPERATOR_WALLET_PRIVATE_KEY`, `AGENT_WALLET_PRIVATE_KEY`, `PRISM_API_KEY`, and `PRISM_BASE_URL` to Render environment and Doppler/local `.env`. Remove any existing single-wallet assumption in the backend wallet initialization module.

---

## Lifecycle Status

> **PRD v1.4.2 is the single source of truth for hackathon submission.** All v1.4.1 items carry forward unless explicitly updated above. This revision integrates PRISM as the AI signal layer for the strategy module: FR-08 rewritten with PRISM `/signals`, `/risk`, and `/resolve` endpoints as the primary AI intelligence source; PRISM SignalProvider added to P0 scope; two new env vars (`PRISM_API_KEY`, `PRISM_BASE_URL`) added; Open Question 9 closed; Risk #10 added for PRISM credit management; alignment checklist updated with v1.4.2 column confirming AI agent intelligence layer coverage. No other sections changed. Items marked `⚠️ REMAINING` must be resolved before blockchain integration (Step 3) is marked complete.

### ⚠️ REMAINING Items Summary

| # | Section | What's Left |
| :-- | :-- | :-- |
| R-1 | FR-01 | Add `OPERATOR_WALLET_PRIVATE_KEY` + `AGENT_WALLET_PRIVATE_KEY`; update `register()` call with all 5 args + `data:` URI |
| R-2 | FR-03 | Implement internal→RiskRouter TradeIntent mapping; update policy defaults to stay below hard limits; add nonce tracking |
| R-3 | FR-04 | Add `score` argument to `postEIP712Attestation()` using defined score policy table |
| R-4 | FR-05 | Add `simulateIntent()` viem read call to frontend Simulate Screen before backend POST |
| R-5 | FR-09 | Rewrite reputation service as explicit `submitFeedback()` calls; verify feedbackType enum from Etherscan ABI |
| R-6 | NFR / Env | Add `OPERATOR_WALLET_PRIVATE_KEY`, `AGENT_WALLET_PRIVATE_KEY`, `PRISM_API_KEY`, `PRISM_BASE_URL` to Render + local environment |
| R-7 | FR-08 | Implement PRISM SignalProvider class: `/resolve` → `/signals` → `/risk` call sequence with `SignalProvider` interface; wire into strategy loop tick |
