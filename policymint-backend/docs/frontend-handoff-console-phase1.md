# Frontend Handoff — Console Phase 1 APIs

Date: 2026-04-11

## Delivered Endpoints

- `GET /v1/agents/:id/stats`
- `GET /v1/agents/:id/events`
- `GET /v1/agents/:id/pnl?window=competition|24h|7d`
- `GET /v1/agents/:id/drawdown-comparison?window=competition|24h|7d`

All routes are registered in protected mode and require API-key auth.

## Base URL and Auth Contract

- Base URL: same API origin used for existing backend routes (for local dev: `http://localhost:3000`).
- Header format (required):

```http
Authorization: Bearer pm_live_xxxxxxxx...
```

- Agent scope rule: `:id` in path must match the authenticated API key's agent.

## Response Envelope

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "agent_id": "uuid",
    "generated_at": "2026-04-11T00:00:00.000Z"
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CURSOR",
    "message": "Cursor is malformed or unsupported"
  }
}
```

Supported error codes:

- `AGENT_NOT_FOUND`
- `AUTH_REQUIRED`
- `FORBIDDEN`
- `INVALID_WINDOW`
- `INVALID_CURSOR`
- `COMPETITION_WINDOW_NOT_CONFIGURED`
- `INTERNAL_ERROR`

## Type Contracts

- Backend type source: `src/types/console-api.ts`
- Frontend mirror type source: `../policymint-console/types/console-api.ts`

## Window and Baseline Config

- `COMPETITION_WINDOW_START_AT` (ISO datetime) is required for `window=competition`.
- `HACKATHON_BASELINE_ALLOCATION_USD` controls baseline allocation used in KPI outputs.

## Notes on Computation Inputs

- Data source is PostgreSQL only (`intent_evaluations`, `validation_records`, `reputation_signals`).
- No chain reads are performed at query time.
- PnL and drawdown calculations read optional numeric fields from `intent_params`:
  - PnL: `realized_pnl_usd` / `pnl_usd` (or scaled variants)
  - Notional for blocked simulation: `amount_usd` (or scaled variants)

## OpenAPI Fragment

- Added file: `docs/console-api-phase1.openapi.yaml`
