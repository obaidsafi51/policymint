# Phase 2 Auth QA Matrix

## Layer 1 — SIWE Login

| ID | Scenario | Expected |
| --- | --- | --- |
| L1-01 | Valid SIWE login, wallet owns 1+ agents | `200`, HttpOnly cookie set, `agent_ids` returned |
| L1-02 | Valid SIWE login, wallet owns 0 agents | `200`, cookie set, `agent_ids: []` |
| L1-03 | Invalid signature | `401`, `SIWE_INVALID` |
| L1-04 | Expired SIWE message (>5 min) | `401`, `SIWE_INVALID` |
| L1-05 | Nonce mismatch/replay | `401`, `SIWE_NONCE_MISMATCH` |

## Layer 2 — Session + Refresh

| ID | Scenario | Expected |
| --- | --- | --- |
| L2-01 | Valid session cookie | `200`, `operator_wallet`, `agent_ids`, `expires_at` |
| L2-02 | Expired token in grace window (<1h) | `200`, refreshed cookie with new 4h expiry |
| L2-03 | Expired token beyond grace (>1h) | `401`, `TOKEN_EXPIRED` |
| L2-04 | Missing cookie | `401`, `TOKEN_MISSING` |
| L2-05 | Tampered token | `401`, `TOKEN_INVALID` |
| L2-06 | Logout | `200`, session cookie cleared (`Max-Age=0`) |

## Layer 3 — Backend Scope Middleware

| ID | Scenario | Expected |
| --- | --- | --- |
| L3-01 | Valid token, in-scope agent route | `200` |
| L3-02 | Valid token, out-of-scope agent route | `403`, `AGENT_SCOPE_VIOLATION` |
| L3-03 | Missing `X-Operator-Token` | `401`, `TOKEN_MISSING` |
| L3-04 | Expired token | `401`, `TOKEN_EXPIRED` |
| L3-05 | Invalid signature/wrong secret | `401`, `TOKEN_INVALID` |
| L3-06 | `/v1/evaluate` with API key | Unchanged behavior |

## Layer 4 — Proxy Behavior

| ID | Scenario | Expected |
| --- | --- | --- |
| L4-01 | Valid cookie → `/api/proxy/v1/agents/:id/*` | Backend response passes through |
| L4-02 | Missing cookie → protected proxy path | `401` from proxy, no backend call |
| L4-03 | Expired token in grace | silent refresh + success + `Set-Cookie` forwarded |
| L4-04 | Expired token beyond grace | `401`, `SESSION_EXPIRED` |
| L4-05 | Login via proxy | backend `Set-Cookie` forwarded to browser |
| L4-06 | Backend URL leakage | `BACKEND_URL` not visible in browser network requests |

## Layer 5 — Frontend Routing

| ID | Scenario | Expected |
| --- | --- | --- |
| L5-01 | Authenticated user hits `/dashboard` | Redirect to `/dashboard/{firstAgentId}` |
| L5-02 | Authenticated user with invalid route agent id | Redirect to first valid scoped agent |
| L5-03 | Authenticated user with zero agents on dashboard | Redirect to `/onboarding` |
| L5-04 | Unauthenticated user hits protected routes | Redirect to `/` |
| L5-05 | Logout from app | Session cleared + query cache cleared |
