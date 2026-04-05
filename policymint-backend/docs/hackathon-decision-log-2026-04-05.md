# Hackathon Decision Log (2026-04-05)

## Decision: Do **not** implement `PATCH /v1/policies/:id` before submission

### Status
- Decision: **Deferred intentionally** (not blocked)
- Scope: Backend API
- Reason: There is currently no policy update write route in production scope; adding one now increases risk and has no leaderboard impact.

### Rationale (context-based)
- Current submission window prioritizes deploy stability over new API surfaces.
- The exploit path is theoretical until a write update route exists.
- Existing policy creation path already enforces ceiling validation in `POST /v1/policies`.
- Seed/default values are already within RiskRouter-safe thresholds.

## Post-hackathon backlog item (P1)

### `PATCH /v1/policies/:id`
Implement partial policy update with versioned policy history.

#### Requirements
1. Accept partial JSONB policy updates using merge semantics.
2. Reuse the same Zod ceiling validation as `POST /v1/policies` through a shared schema.
3. Reject updates that would set:
   - `spend_cap_per_tx > 450` (USD)
   - `daily_loss_budget > 4` (%)
   with HTTP `422`.
4. Preserve history: do not mutate old policy rows in-place.
   - Mark previous active version as `active: false`.
   - Insert a new active version row.

#### Out of scope until hackathon submission is complete
- New endpoint implementation
- Extended update-route test matrix
- Additional migration/schema work only needed by update semantics

## What to execute now (operational blockers)
1. `npx prisma migrate deploy && npx prisma generate`
2. `npx vitest run`
3. Configure Render env vars:
   - `OPERATOR_WALLET_PRIVATE_KEY`
   - `AGENT_WALLET_PRIVATE_KEY`
4. Fund operator wallet with Sepolia ETH for write transactions.
5. Hand off frontend `simulateIntent()` to `/frontend` (R-4).
