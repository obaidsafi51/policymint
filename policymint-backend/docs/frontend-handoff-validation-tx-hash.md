# Frontend Handoff — `validation_tx_hash` Mapping

Date: 2026-04-04

## Confirmed Column Naming

For the `intent_evaluations` table:

- Prisma field (application code): `validationTxHash`
- PostgreSQL column (database): `validation_tx_hash`

This is the canonical mapping to use in all frontend/backend integration discussions.

## API Write-Back Behavior

Endpoint: `PATCH /v1/evaluations/:id/tx-hash`

On success, backend writes:

1. `intent_evaluations.validation_tx_hash` (via Prisma `validationTxHash`)
2. `intent_evaluations.emitted_at` (via Prisma `emittedAt`) with current server timestamp
3. `validation_records.tx_hash` (via Prisma `txHash`)

## Frontend Guidance

- If frontend reads raw SQL views or Supabase table columns, reference `validation_tx_hash`.
- If frontend reads API DTOs, continue using API response fields (example: `tx_hash`) and avoid depending on internal Prisma field names.
