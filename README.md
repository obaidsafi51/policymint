# Policy Mint

## Hackathon decision log

- Backend decision and P1 backlog spec for deferred policy update route: [policymint-backend/docs/hackathon-decision-log-2026-04-05.md](policymint-backend/docs/hackathon-decision-log-2026-04-05.md)

## Backend tx-hash write-back

`PATCH /v1/evaluations/:id/tx-hash` closes the on-chain loop after the blockchain service emits to `ValidationRegistry` and receives a confirmed tx hash.

- **Auth:** private endpoint; requires header `x-internal-key: <INTERNAL_SERVICE_KEY>`
- **Env:** set `INTERNAL_SERVICE_KEY` in backend runtime environment
- **Body:** `{ "tx_hash": "0x<64 hex chars>" }`
- **Success (200):** returns `success`, `evaluation_id`, `tx_hash`, and Sepolia `etherscan_url`
- **Persistence:** updates both `intent_evaluations.validation_tx_hash` and `validation_records.tx_hash`

### Error codes

- `400 INVALID_PARAMS` — invalid UUID in route param
- `400 INVALID_BODY` — missing or malformed `tx_hash`
- `401 UNAUTHORIZED` — missing/invalid `x-internal-key`
- `404 EVALUATION_NOT_FOUND` — no evaluation row exists for provided id
- `409 TX_HASH_ALREADY_SET` — evaluation already has a tx hash; overwrite is blocked

