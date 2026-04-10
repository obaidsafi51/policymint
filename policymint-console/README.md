# PolicyMint Console

Next.js 15 operator console frontend for PolicyMint.

## Run

1. Copy `.env.example` to `.env.local` and fill values.
2. Install dependencies:
   - `npm install`
3. Start dev server:
   - `npm run dev`

## Included implementation

- App Router layout shell with sidebar, topbar, dashboard, and simulate screen
- Design tokens from `DESIGN.md` wired in `styles/globals.css`
- React Query hooks for decision feed, PnL, drawdown, and stats (10s/30s/15s polling)
- Shared API client for auth header + response envelope unwrapping + typed error codes
- On-chain reads via `viem` (`ReputationRegistry.getAverageScore`, `RiskRouter.simulateIntent`)
- Simulate flow: on-chain dry run before backend `POST /v1/evaluate`
- Mock/demo mode fallback when `NEXT_PUBLIC_API_URL` is not set

## SIWE authentication

- `GET /api/auth/nonce`: issues nonce and stores it in iron-session httpOnly cookie session
- `POST /api/auth/verify`: verifies SIWE message/signature, creates authenticated session, invalidates nonce
- `GET /api/auth/session`: returns current authenticated wallet or null
- `DELETE /api/auth/logout`: clears session cookie
- Route guard in `middleware.ts` protects `/dashboard/*` and `/simulate/*`
