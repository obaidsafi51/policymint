# PolicyMint — Product Requirements Document

| Field | Value |
| :-- | :-- |
| **Version** | 1.3 |
| **Status** | DRAFT — Hackathon-Aligned Revision |
| **Created** | 2026-03-28 |
| **Owner** | Obaid Safi, Founding PM |
| **Last Updated** | 2026-04-01 |
| **Changelog** | v1.2 → v1.3: Infrastructure-only hackathon execution pivot. Adopted Option A: Split Stack (Render backend + Vercel frontend + Supabase database). Replaced AWS references with Supabase/Render/Vercel, replaced Datadog with Sentry + Pino, replaced Strykr/PRISM signal dependency with Kraken Public REST API / WebSockets, and updated RPC fallback language. No product scope, persona, prize strategy, or challenge alignment changes beyond these items. |

---

## Overview

PolicyMint is a **policy-protected autonomous trading agent** — not just a control plane. It executes on-chain trading strategies through Kraken CLI and the ERC-8004 Hackathon Risk Router while enforcing real-time policy guardrails (spend caps, venue allowlists, daily loss budgets) at every step. Every trade intent is signed with EIP-712, every policy decision emits a validation artifact to the ERC-8004 Validation Registry, and every safe execution cycle accrues on-chain reputation. It is not an alerting bot. It is not passive middleware. It is a **trustless trading agent with provable risk controls**.

---

## Problem Statement

AI agents can autonomously execute trades, manage capital, and coordinate DeFi workflows — but there is no standard mechanism that simultaneously enables execution and enforces verifiable risk boundaries. This gap is measurable: H1 2025 crypto theft reached $3.01 billion. Autonomous trading agents either execute without guardrails (high-performance, high-risk) or are gated behind passive policy engines that never trade (safe but inert). PolicyMint solves both sides: it executes real financial strategies while proving every risk check on-chain via ERC-8004 validation artifacts, making institutional-grade safe execution possible for the first time.

---

## Objective

Ship an MVP that:
1. Registers an autonomous agent identity on the ERC-8004 Identity Registry (ERC-721)
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
- **Goal:** View a transparent, on-chain leaderboard showing PnL, Sharpe ratio, drawdown, and ERC-8004 validation score — all provably linked to a registered Agent Identity NFT

---

## Success Metrics (KPIs)

| Metric | Target | Measurement Tool |
| :-- | :-- | :-- |
| Policy engine latency (p99) | < 2 seconds | Sentry APM |
| False-positive block rate | < 3% (operator override rate on blocked decisions within 5 min) | Amplitude event log |
| **Drawdown prevention value** | ≥ 10% loss reduction vs. unprotected baseline agent | Backtested simulation + live sandbox PnL diff |
| **ERC-8004 reputation score** | ≥ +50 reputation points by end of competition window | ERC-8004 Reputation Registry on-chain |
| **Sharpe ratio** | > 1.0 over competition period | lablab.ai leaderboard |
| Agent wallets under management | 50 by end of Month 2 | PostgreSQL `agents` count |
| SDK integration time (new developer) | < 30 minutes | Onboarding survey |
| Weekly Active Operators | 20 by end of Month 3 | Amplitude DAU/WAU |
| On-chain record emission success rate | > 99% | Chain indexer + Sentry |
| **EIP-712 intent signing success rate** | > 99.5% | Validation Registry event log |

---

## Scope

### P0 — Must-Have for Launch (Hackathon Submission)

- [ ] **ERC-8004 Agent Identity NFT registration** — Mint and register an ERC-721 Agent Identity on the ERC-8004 Identity Registry pointing to Agent Registration JSON, capabilities, endpoints, and agent wallet
- [ ] **UUID v7 internal identity** retained as PostgreSQL primary key (maps to ERC-8004 NFT via `identity_registry` table)
- [ ] **EIP-712 typed data signatures** for all trade intents and attestations (required by ERC-8004 challenge)
- [ ] **EIP-1271 support** for smart-contract wallet verification
- [ ] **EIP-155 chain-id binding** on all signed payloads
- [ ] **Minimal strategy module** — AI-driven momentum or rebalancing strategy that generates TradeIntents programmatically using Kraken Public REST API / WebSockets and/or Kraken CLI market data
- [ ] **Kraken CLI execution adapter** — Agent submits buy/sell orders via Kraken CLI; PolicyMint pre-flight gates every order before CLI execution
- [ ] **Hackathon Capital Sandbox integration** — Agent claims sandbox capital from the Hackathon Capital Vault; all DEX execution routed through the hackathon-provided Risk Router (not direct RPC)
- [ ] Policy configuration: venue allowlist, per-transaction spending cap, daily loss budget
- [ ] Intent classifier: maps proposed agent actions to approved policy classes
- [ ] Policy engine: real-time evaluate → sign or block gate
- [ ] Block reason generation: human-readable explanation returned to agent and operator
- [ ] **ERC-8004 Validation Registry emission** — Every allow/block decision emits an EIP-712 validation artifact to the ERC-8004 Validation Registry (replaces/augments Base Sepolia generic event)
- [ ] **ERC-8004 Reputation hook** — Each safe execution cycle (no policy violations) emits a positive trust signal; policy violations emit a negative signal; both feed the agent's on-chain reputation score
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

### Explicitly Out of Scope (v1.3)

- Cross-chain bridging policy enforcement
- Human multisig replacement or co-signing
- Fiat off-ramp controls
- Mobile application
- Support for non-EVM chains (beyond Kraken CEX track)
- Zero-knowledge proofs of policy compliance (zkML is P1 optional, not P0)

---

## Functional Requirements

### FR-01: Agent Registration (Updated)

- An operator must be able to register an agent by providing: agent name, deployer wallet address, metadata URI, target chain ID, and agent strategy type
- Each registered agent receives:
  - A unique `agent_id` (UUID v7) as the internal PostgreSQL primary key
  - An API key scoped to that agent
  - **An ERC-8004 Agent Identity NFT minted on the configured L2/testnet**, linked to an Agent Registration JSON containing capabilities, endpoints, and agent wallet address
- The ERC-8004 identity NFT token ID must be stored in the `agents` table alongside UUID v7 (`erc8004_token_id` column)
- Registration must be available via REST API and via the TypeScript SDK

### FR-02: Policy Configuration

- An operator must be able to attach one or more policies to a registered agent
- Supported policy types at launch: `venue_allowlist`, `spend_cap_per_tx`, `daily_loss_budget`
- Policies must be activatable and deactivatable without deleting historical records
- Policy parameters must be stored as JSONB to allow type extensibility
- *(No change from v1.2)*

### FR-03: Intent Evaluation (Updated)

- An agent must be able to submit a proposed transaction intent to the policy engine endpoint
- The intent must conform to this schema and be **EIP-712 typed** for on-chain attestation:

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
    "chainId": "integer",
    "verifyingContract": "string (address)"
  },
  "params": "object (arbitrary key-value for extensibility)"
}
```

- The engine must evaluate the intent against all active policies for that agent
- Response must include: `result` (allow | block), `reason` (if block), `policy_id`, `evaluation_id`, and **`eip712_signed_intent`** (the signed payload for submission to Validation Registry)
- For `allow` decisions, the agent must use the returned `eip712_signed_intent` as the authorization proof when calling the Hackathon Risk Router or Kraken CLI

### FR-04: On-Chain Validation Record (Updated)

- Every `allow` or `block` decision must emit a validation artifact to **two targets**:
  1. **ERC-8004 Validation Registry** — EIP-712 signed attestation including agent ERC-721 token ID, evaluation_id, result, strategy checkpoint hash, and timestamp
  2. **Base Sepolia generic event** (fallback for non-ERC-8004 tracks)
- The event payload must include: `agent_id` hash (linked to ERC-8004 token ID), `evaluation_id`, `result`, `timestamp`
- The emitted transaction hash must be stored in `validation_records` table

### FR-05: Operator Console (Updated)

- The console must be deployed on **Vercel Free Tier**
- Must display a real-time feed of policy decisions for all registered agents
- Each decision card: agent name, action attempted, result, rule violated (if block), timestamp, on-chain tx hash
- **New: PnL chart** showing cumulative performance over competition window
- **New: Reputation score panel** showing current ERC-8004 reputation score and trend
- **New: Drawdown vs. baseline comparison** — live chart comparing PolicyMint-protected PnL vs. simulated unprotected baseline
- Simulate screen must return a result within 3 seconds

### FR-06: Kraken CLI Execution Adapter (New)

- The agent must interface with Kraken CLI (zero-dependency Rust binary with MCP server) for CEX-side trade execution
- Before each Kraken CLI execution call, the PolicyMint policy engine must evaluate the intent and return a signed authorization
- If `block`, the CLI call must not proceed and the block reason must be logged
- If `allow`, the CLI call proceeds using the returned EIP-712 signed intent as the execution proof
- A read-only Kraken API key must be configurable for leaderboard verification by lablab.ai

### FR-07: Hackathon Capital Sandbox Integration (New)

- The agent must support operating through the **Hackathon Capital Vault** funded sub-account
- All DEX trades must be routed through the **hackathon-provided Risk Router** (Uniswap-style whitelisted contract) — no direct RPC calls for execution
- The agent must claim sandbox capital on initialization and track stablecoin-denominated PnL
- Position size limits, max leverage, whitelisted markets, and daily loss limits enforced by the Risk Router must be mapped to PolicyMint policy types

### FR-08: Strategy Module (Updated)

- The agent must include a minimal AI-driven trading strategy that programmatically generates `TradeIntent` objects
- Minimum viable strategy at launch: **momentum/trend-following** using **Kraken Public REST API / WebSockets** and/or Kraken CLI market data feed
- The strategy loop must: (1) fetch signals, (2) generate a TradeIntent, (3) submit to PolicyMint policy engine, (4) execute if allowed, (5) emit validation artifact
- Strategy logic must be modular and swappable (strategy interface pattern) to allow fast iteration
- The persistent strategy loop and backend API must run on **Render Free Web Service**

### FR-09: ERC-8004 Reputation Hook (New)

- After each completed trading cycle (allow → execute → confirm), the agent must emit a **positive trust signal** to the ERC-8004 Reputation Registry
- After each policy block event, the agent must emit a **negative trust signal** (or no signal, per registry spec)
- Reputation score must be queryable from the operator console and the on-chain registry
- Reputation accumulation must be tied to objective outcomes: execution within declared policy bounds, PnL relative to drawdown limits, validation score from validators

---

## Non-Functional Requirements

- **Latency:** Policy evaluation p99 < 2s under normal load
- **Concurrent intent evaluations:** Up to 10 per second per agent under normal load (p99 latency < 2s)
- **Availability:** API target 99.5% uptime (acceptable for v1 beta)
- **Security:** No agent API key stored in plaintext; all keys hashed (bcrypt); HTTPS only
- **Operator console authentication:** Web3 only via SIWE (Sign-In With Ethereum). Agents use scoped API keys. No passwords stored.
- **Data retention:** Audit logs retained for minimum 90 days
- **Chain:** Base Sepolia for testnet launch; Base Mainnet for production launch
- **Compliance:** All transaction data stored in Supabase PostgreSQL; no PII collected from agents
- **Observability:** Sentry for error tracking and APM; Pino structured logs with Render native log tailing
- **Infrastructure:** **Option A — Split Stack**: Render Free Web Service for backend/agent loop, Vercel Free Tier for frontend, Supabase Free Tier for PostgreSQL
- **RPC:** Alchemy Free Tier as primary provider; Base Sepolia Public RPC (`https://sepolia.base.org`) as fallback
- **EIP Standards Compliance:** All signed payloads must conform to EIP-712 (typed data), EIP-1271 (smart contract wallet support), EIP-155 (chain-id binding)

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

**Recommended submission positioning:** *"PolicyMint is the first trustless trading agent with provable risk controls — it executes strategies, enforces policy, and proves every risk check on-chain via ERC-8004."*

---

## Assumptions & Risks

| # | Assumption / Risk | Mitigation |
| :-- | :-- | :-- |
| 1 | Intent classifier can be trained on synthetic data for MVP | Rule-based classifier first; ML added in Sprint 2 iteration |
| 2 | Base Sepolia RPC reliability could impact on-chain emission | Use Alchemy Free Tier as primary RPC with Base Sepolia Public RPC as fallback |
| 3 | Agent builders will integrate SDK without hand-holding | Ship integration guide + working code example on day 1 of SDK release |
| 4 | Policy engine may be too strict, causing high false-positive blocks | Set conservative default thresholds; let operators tune per agent |
| 5 | ERC-8004 registry contracts may have incomplete/unstable ABI at hackathon start | Use official ERC-8004 developer walkthrough (Solidity + JS examples) from challenge resources; deploy own registry copy on Base Sepolia if needed |
| 6 | Hackathon Capital Vault and Risk Router contract addresses may not be published until hackathon kickoff | Abstract Risk Router as a pluggable interface in FR-07; fallback to direct DEX call on Base Sepolia for demo |
| 7 | Kraken CLI paper-trading sandbox may not reflect real market conditions | Use Kraken CLI local paper-trading sandbox for testing; switch to live read-only API key for leaderboard verification |
| 8 | Kraken public market data limits or transport issues could interrupt signal polling | Prefer WebSockets for live prices, back off REST polling, and cache short-lived market snapshots locally |
| 9 | ERC-8004 reputation scoring validators may not be active during hackathon window | Self-emit validation scores using the challenge-provided validator interface; document this as the submission's trust model |

---

## Open Questions

| # | Question | Resolution |
| :-- | :-- | :-- |
| 1 | Agent identity primary key | **Dual key: UUID v7 (internal DB) + ERC-8004 ERC-721 token ID (external on-chain). No replacement — additive.** |
| 2 | On-chain validation record ABI | **Use ERC-8004 Validation Registry ABI from official spec; fallback to custom Base Sepolia contract if registry unavailable** |
| 3 | Operator console auth | Web3 only via SIWE *(unchanged)* |
| 4 | Which ERC-8004 network to deploy registries on? | **Base Sepolia for testnet (aligns with existing PRD chain config); confirm with hackathon team whether official registry is pre-deployed or team-deployed** |
| 5 | Kraken CLI track vs. ERC-8004 track — enter one or both? | **Recommended: combined submission. Kraken CLI handles CEX execution; Risk Router handles DEX execution. PolicyMint policy engine gates both.** |
| 6 | Kraken Public API / WebSockets vs. Kraken CLI market data for strategy signals? | **Use Kraken CLI market data where convenient for the Kraken track; use Kraken Public REST API / WebSockets as the default free signal source. Abstract both behind a common interface.** |
| 7 | EIP-1271 smart contract wallet — deploy custom or use existing? | **Use Safe (Gnosis Safe) as the agent's smart contract wallet for EIP-1271 compliance. Faster than building custom.** |

---

## Alignment Checklist vs. Challenge Requirements

| Challenge Requirement | PRD v1.1 Status | PRD v1.2 / v1.3 Status |
| :-- | :-- | :-- |
| Real financial function (trade/risk/yield/protect) | ⚠️ Partial (passive only) | ✅ Active — strategy module generates and executes TradeIntents |
| Kraken CLI integration | ❌ None | ✅ FR-06: Kraken CLI Execution Adapter |
| ERC-8004 Identity Registry (ERC-721) | ❌ Out of Scope | ✅ FR-01 updated: ERC-721 identity minted on registration |
| EIP-712 typed data signatures | ❌ None | ✅ FR-03 updated: all intents EIP-712 signed |
| EIP-1271 smart contract wallet support | ❌ None | ✅ NFR: EIP-1271 compliance via Safe wallet |
| EIP-155 chain-id binding | ❌ None | ✅ NFR: all signed payloads EIP-155 bound |
| Hackathon Capital Sandbox / Risk Router | ❌ None | ✅ FR-07: Hackathon Capital Sandbox Integration |
| ERC-8004 Validation Registry emission | ⚠️ Partial (generic Base Sepolia only) | ✅ FR-04 updated: emits to ERC-8004 Validation Registry |
| Reputation accumulation | ❌ None | ✅ FR-09: ERC-8004 Reputation Hook |
| Validation artifacts (trade intents, risk checks) | ✅ Strong (on-chain records) | ✅ Strengthened: EIP-712 attestations + Validation Registry |
| Risk-adjusted profitability / drawdown control | ⚠️ Partial (no PnL tracking) | ✅ Operator console now tracks PnL + drawdown vs. baseline |
| Surge project registration | ❌ Not mentioned | ✅ P0 scope item: register at early.surge.xyz |

---

## Lifecycle Status

> **PRD v1.3 is the single source of truth for hackathon submission.** All v1.2 items carry forward unless explicitly updated above. This revision only applies the zero-cost infrastructure pivot selected by the team: **Option A — Split Stack**. UUID v7 is retained. ERC-8004 identity is additive. Submission targets combined Kraken CLI + ERC-8004 dual-track. Prize primary target: Best Compliance & Risk Guardrails ($2,500) + Best Risk-Adjusted Return ($5,000).