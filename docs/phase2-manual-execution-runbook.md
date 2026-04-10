# Phase 2 Manual QA Execution Runbook

This runbook executes the matrix in strict order:

1. L3 (direct Render backend, security-first)
2. L1 + L2 (SIWE + session refresh via proxy)
3. L4 (proxy behavior + CORS)
4. L5 (browser route protection)
5. Regression (Phase 1 scenarios through proxy)

Use this together with [docs/phase2-auth-test-matrix.md](docs/phase2-auth-test-matrix.md).

---

## Required Inputs

- `RENDER_BASE_URL` (example: `https://policymint-backend.onrender.com`)
- `VERCEL_BASE_URL` (example: `https://policymint-console.vercel.app`)
- Two real agent UUIDs:
  - `IN_SCOPE_AGENT_ID`
  - `OUT_OF_SCOPE_AGENT_ID`
- A valid operator token for direct L3 positive tests (`VALID_OPERATOR_TOKEN`) and expired/invalid variants
- Browser with DevTools access (Application + Network tabs)

Optional but recommended:

- Postman workspace for preserving request history
- Separate browser profile to avoid stale cookies

---

## How to Populate Script Variables Quickly

### Minimum required for L3 script

- `RENDER_BASE_URL`: your backend base URL on Render
- `IN_SCOPE_AGENT_ID`: agent UUID owned by the wallet you will authenticate with
- `OUT_OF_SCOPE_AGENT_ID`: another agent UUID not owned by that wallet

Example lookup SQL (run on your dev DB):

```sql
select id, wallet_address, is_active, created_at
from agents
order by created_at desc;
```

Pick one agent owned by your test wallet for `IN_SCOPE_AGENT_ID` and a different-wallet agent for `OUT_OF_SCOPE_AGENT_ID`.

### Optional token variables (unlock full L3 coverage)

- `VALID_OPERATOR_TOKEN`
- `EXPIRED_OPERATOR_TOKEN`
- `INVALID_OPERATOR_TOKEN`

#### Easiest way to get `VALID_OPERATOR_TOKEN`

1. Complete SIWE login in browser via Vercel app
2. Open DevTools → Application → Cookies → your Vercel domain
3. Copy cookie value for `policymint_operator_session`
4. Use that as `VALID_OPERATOR_TOKEN`

#### `INVALID_OPERATOR_TOKEN`

Use a tampered variant of the valid token, for example append one character:

```bash
INVALID_OPERATOR_TOKEN="${VALID_OPERATOR_TOKEN}x"
```

#### `EXPIRED_OPERATOR_TOKEN`

Options:

- Fastest: use a known expired token from a prior test run
- Controlled local test: temporarily reduce JWT TTL in local backend, mint token, wait for expiry, restore config
- If unavailable, leave unset and L3 script will skip that case

### Optional `VALID_AGENT_API_KEY` (L3-06)

Set this only if you want the script to check `/v1/evaluate` auth-path isolation. If unset, L3-06 is skipped.

---

## Layer L3 — Direct Render Security Tests (Run First)

Goal: prove backend middleware behavior independent of frontend/proxy.

### One-command harness (recommended)

```bash
RENDER_BASE_URL="https://your-render-backend.onrender.com" \
IN_SCOPE_AGENT_ID="00000000-0000-0000-0000-000000000001" \
OUT_OF_SCOPE_AGENT_ID="00000000-0000-0000-0000-000000000002" \
VALID_OPERATOR_TOKEN="<valid-token>" \
EXPIRED_OPERATOR_TOKEN="<expired-token>" \
INVALID_OPERATOR_TOKEN="<tampered-token>" \
VALID_AGENT_API_KEY="pm_live_xxxxxxxx" \
bash ./docs/phase2-l3-security-checks.sh
```

This script validates L3-01 through L3-06 and exits non-zero on any failure.

### L3-01 Valid token + in-scope agent

```bash
curl -i "$RENDER_BASE_URL/v1/agents/$IN_SCOPE_AGENT_ID/stats" \
  -H "X-Operator-Token: $VALID_OPERATOR_TOKEN"
```

Pass criteria:

- `HTTP 200`
- response envelope `success: true`

### L3-02 Valid token + out-of-scope agent

```bash
curl -i "$RENDER_BASE_URL/v1/agents/$OUT_OF_SCOPE_AGENT_ID/stats" \
  -H "X-Operator-Token: $VALID_OPERATOR_TOKEN"
```

Pass criteria:

- `HTTP 403`
- `error.code = AGENT_SCOPE_VIOLATION`

### L3-03 Missing token

```bash
curl -i "$RENDER_BASE_URL/v1/agents/$IN_SCOPE_AGENT_ID/stats"
```

Pass criteria:

- `HTTP 401`
- `error.code = TOKEN_MISSING`

### L3-04 Expired token

```bash
curl -i "$RENDER_BASE_URL/v1/agents/$IN_SCOPE_AGENT_ID/stats" \
  -H "X-Operator-Token: $EXPIRED_OPERATOR_TOKEN"
```

Pass criteria:

- `HTTP 401`
- `error.code = TOKEN_EXPIRED`

### L3-05 Tampered/invalid token

```bash
curl -i "$RENDER_BASE_URL/v1/agents/$IN_SCOPE_AGENT_ID/stats" \
  -H "X-Operator-Token: $INVALID_OPERATOR_TOKEN"
```

Pass criteria:

- `HTTP 401`
- `error.code = TOKEN_INVALID`

### L3-06 Agent API path unchanged (`/v1/evaluate`)

```bash
curl -i "$RENDER_BASE_URL/v1/evaluate" \
  -H "Authorization: Bearer $VALID_AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "agent_id":"'$IN_SCOPE_AGENT_ID'",
    "action_type":"trade",
    "venue":"kraken-spot",
    "amount":"100",
    "token_in":"BTC",
    "token_out":"USD",
    "params":{}
  }'
```

Pass criteria:

- route behavior remains API-key driven
- no dependency on `X-Operator-Token`

---

## Layers L1 + L2 — SIWE + Session via Proxy

Goal: verify auth lifecycle and cookie refresh path through Vercel proxy.

### L1 nonce and verify path

1. `GET $VERCEL_BASE_URL/api/proxy/auth/nonce`
2. Sign SIWE message with wallet
3. `POST $VERCEL_BASE_URL/api/proxy/auth/verify` with `{ message, signature }`

Pass criteria:

- `HTTP 200`
- response contains `success: true`, `operator_wallet`, `agent_ids`
- `Set-Cookie` returned on proxy response

### Critical cookie-domain gate (must pass before declaring L1 clean)

In browser DevTools:

1. Open **Application → Cookies**
2. Select the **Vercel domain** (not Render)
3. Confirm `policymint_operator_session` exists under Vercel origin

Fail conditions:

- cookie only appears on Render domain
- cookie absent after successful verify response

If this fails, all later `/auth/session` checks will 401.

### L2 session/refresh/logout

#### L2-01 Valid session

`GET $VERCEL_BASE_URL/api/proxy/auth/session`

Pass criteria:

- `HTTP 200`
- `success: true`, `operator_wallet`, `agent_ids`, `expires_at`

#### L2-02 Expired within grace

Use a grace-window-expired cookie/token and call session endpoint.

Pass criteria:

- `HTTP 200`
- response success
- new `Set-Cookie` issued with renewed expiry

#### L2-03 Beyond grace

Pass criteria:

- `HTTP 401`
- `error.code = TOKEN_EXPIRED`

#### L2-06 Logout

`POST $VERCEL_BASE_URL/api/proxy/auth/logout`

Pass criteria:

- `HTTP 200`
- `Set-Cookie` clears session (`Max-Age=0`)

---

## Layer L4 — Proxy and CORS

### One-command harness (automatable subset)

```bash
VERCEL_BASE_URL="https://your-vercel-app.vercel.app" \
RENDER_BASE_URL="https://your-render-backend.onrender.com" \
IN_SCOPE_AGENT_ID="00000000-0000-0000-0000-000000000001" \
FRONTEND_ORIGIN="https://your-vercel-app.vercel.app" \
OPERATOR_COOKIE_VALUE="<optional-valid-cookie>" \
GRACE_WINDOW_COOKIE_VALUE="<optional-grace-cookie>" \
BEYOND_GRACE_COOKIE_VALUE="<optional-beyond-grace-cookie>" \
bash ./docs/phase2-l4-proxy-checks.sh
```

What this script validates:

- L4-02 missing-cookie proxy block
- L4-01 pass-through with valid cookie (if provided)
- L4-03 grace-window refresh (if provided)
- L4-04 beyond-grace rejection (if provided)
- L4-07 CORS wildcard/arbitrary-origin rejection
- L4-06 backend URL payload leak precheck

Manual browser validation is still required for final L4 sign-off (Network tab origin behavior and cookie jar placement).

### L4-01/L4-02 Proxy auth gating

- with valid cookie: proxied `/v1/agents/:id/*` returns backend payload
- with no cookie: proxy returns `401` before backend data access

### L4-03/L4-04 Silent refresh behavior

- within grace: request succeeds and cookie rotates
- beyond grace: `401` with `SESSION_EXPIRED`

### L4-05 Login `Set-Cookie` forwarding

Verify on `/api/proxy/auth/verify` response headers that `Set-Cookie` is preserved.

### L4-06 Backend URL secrecy

Network tab checks:

- browser requests target only `/api/proxy/*` on Vercel origin
- no response payload or frontend source leaks `BACKEND_URL`

### L4-07 CORS direct browser call to Render

From browser console:

```js
fetch("<RENDER_BASE_URL>/v1/agents/<id>/stats", { credentials: "include" })
```

Pass criteria:

- blocked by CORS policy (or rejected preflight)
- direct browser-to-Render access not allowed cross-origin

---

## Layer L5 — Browser Route Protection

### L5-01 Authenticated in-scope route

- visit `/dashboard/<in-scope-id>`
- dashboard renders

### L5-02 Unauthenticated

- clear cookies
- visit `/dashboard/<id>` and `/simulate`

Pass criteria:

- redirect to `/`

### L5-03 Out-of-scope route

- authenticated user visits `/dashboard/<out-of-scope-id>`

Pass criteria:

- redirect to first in-scope agent dashboard

### L5-04 Zero-agent operator

- authenticated operator with `agent_ids = []` visits `/dashboard`

Pass criteria:

- redirect to `/onboarding`

### L5-05 Logout behavior

- logout from authenticated session

Pass criteria:

- redirect to `/`
- protected routes no longer accessible
- stale dashboard data cleared from client cache

---

## Regression — Phase 1 Through Proxy

Re-run all existing 9 Phase 1 scenarios with frontend pointed at `/api/proxy`.

Pass criteria:

- no behavior regressions
- data hooks (`events`, `pnl`, `drawdown`, `stats`) continue to function
- simulate flow still invalidates and updates feed/stats as expected

---

## Test Sign-off Template

Use this summary when reporting results:

- L3: PASS/FAIL (+ failing case IDs)
- L1/L2: PASS/FAIL (+ cookie-domain check result)
- L4: PASS/FAIL (+ CORS and URL leakage result)
- L5: PASS/FAIL (+ redirect correctness)
- Regression: PASS/FAIL
- Blockers: list exact failure + endpoint + error code + timestamp
