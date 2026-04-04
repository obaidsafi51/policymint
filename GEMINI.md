# PolicyMint — Antigravity project rules

## Project context

PolicyMint is a policy-protected autonomous crypto trading agent dashboard. The operator console is a Next.js 14 App Router frontend deployed on Vercel Free Tier. The backend runs on Render (Node.js/Express) with Supabase PostgreSQL. The agent executes trades via Kraken CLI and ERC-8004 Risk Router while enforcing real-time policy guardrails (spend caps, venue allowlists, daily loss budgets).

Phases 1-6 of the frontend are already built. Do NOT restructure, rename, or reorganize existing files, components, or folder structure. Build on top of what exists.

## Tech stack

- Framework: Next.js 14 with App Router (NOT Pages Router)
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS + CSS custom properties (design tokens in globals.css)
- Charts: recharts
- Wallet: connectkit or rainbowkit + siwe for Sign-In With Ethereum
- Data fetching: SWR or React Query
- Deploy target: Vercel Free Tier
- Fonts: Inter (sans-serif), JetBrains Mono (monospace) via next/font/google

## Design system — critical rules

### Colors — ALWAYS use CSS variables, NEVER hardcode hex values

The design tokens are already defined in globals.css with light/dark mode support. Reference them as var(--token-name). The complete token list:

Backgrounds: --bg-page, --bg-card, --bg-surface, --bg-elevated, --bg-brand, --bg-success, --bg-danger, --bg-warning, --bg-info
Text: --text-primary, --text-secondary, --text-tertiary, --text-brand, --text-success, --text-danger, --text-warning, --text-info, --text-on-brand
Borders: --border-default, --border-hover, --border-focus, --border-success, --border-danger

### Brand mint vs success green — NEVER confuse these

Brand mint (#34D399 / #10B981) is for identity: primary buttons, active nav, reputation scores, focus rings.
Success emerald (#22C55E / #16A34A) is for status: allow badges, positive PnL, policy pass indicators.
These are two different greens serving two different purposes. They sit side by side in the UI and must remain distinguishable.

### Typography

- Two weights only: 400 (regular) and 500 (medium). NEVER use 600, 700, or bold.
- Sentence case everywhere. No Title Case. No ALL CAPS except badge labels (ALLOWED, BLOCKED).
- Monospace (JetBrains Mono / --font-mono) for ALL on-chain data: wallet addresses, tx hashes, evaluation IDs, JSON payloads, contract addresses.
- No mid-sentence bolding. Entity names go in monospace, not bold.
- Minimum font size: 11px.

### Spacing and borders

- All borders: 0.5px solid var(--border-default). Never 1px or 2px.
- Border radius: 6px for badges/pills, 8px for inputs/buttons/tiles, 12px for cards/containers.
- No rounded corners on single-sided borders (border-left accents on decision cards).
- No box-shadows, no gradients, no glow effects. Flat surfaces only.

### Component-specific rules

Decision card left border: 3px solid. Allow = success green (#22C55E), Block = danger (#E74C6F).
Status badges: 11px, weight 500, padding 2px 8px, radius 6px. Text color uses 800 stop from the same ramp as background — never use black or --text-primary on colored fills.
Metric tiles: 20px value, 11px label, 11px subtitle. bg-card background with border-default.
Buttons: Primary = Mint 400 bg (#34D399) with Mint 900 text (#064430). Secondary = transparent with border-hover.

### Dark mode

Dark mode swaps light/dark stops. Data visualization colors (Success 400, Danger 400, Mint 400) stay the SAME in both modes. Surface 900 (#0A1210) becomes page background. Surface 800 (#243D35) becomes card background. All semantic tokens auto-resolve via CSS custom properties.

### Chart colors

- Drawdown vs baseline: protected line = #10B981 solid, unprotected baseline = #C8D8D3 dashed, prevention delta fill = #E6FBF3 at 60% opacity
- PnL chart: #22C55E line with #ECFDF5 area fill
- Reputation chart: #10B981 step line with #C8D8D3 dashed target benchmark

### On-chain data formatting

Wallet addresses and tx hashes: truncated with ellipsis showing first 6 + last 4 characters (e.g., 0x8f3a...c41d). Full values via copy-on-click. Contract addresses are never truncated in policy configuration views.

## Code conventions

- Functional components only. No class components.
- Prefer named exports over default exports.
- Use interface for object shapes, type for unions/intersections.
- Keep files under 300 lines. Extract components when exceeding this.
- All API response types defined in /lib/types.ts.
- Mock data in /lib/mock-data.ts — keep as fallback even after API integration.
- Use try/catch for all async operations. Show error states, never silent failures.

## Existing component library — do NOT rebuild these

The following components already exist from Phases 1-6. Import and use them, do not create duplicates:
- StatusBadge (variants: allowed, blocked, active, inactive, pending, error)
- MetricTile (props: label, value, subtitle, valueColor)
- DecisionCard (props: decision object with all fields)
- TxHashLink (props: hash, explorerBaseUrl)
- WalletAddress (props: address)
- LoadingSkeleton (variants: tile, card, chart)
- EmptyState (props: title, description, ctaLabel, onCtaClick)
- Toast (via context provider, variants: success, warning, error)

## Existing pages — do NOT rebuild these

- /dashboard — metric tiles, 3 charts (drawdown, PnL, reputation), live decision feed
- /simulate — intent form + verdict display with allow/block/idle states
- /agents — agent list + registration modal with API key one-time reveal
- /policies — policy list with venue allowlist, spend cap, daily loss budget editors
- /audit — filterable decision log with sortable table

## API integration rules (Phase 7)

- Base URL: NEXT_PUBLIC_API_URL env var (default: http://localhost:3001/api/v1)
- Auth: SIWE (Sign-In With Ethereum). No email/password. No passwords stored.
- All API requests include session token from SIWE auth flow.
- Use SWR or React Query with 30-second revalidation for metrics.
- Real-time decision feed: use EventSource (SSE), fall back to 10-second polling.
- If NEXT_PUBLIC_API_URL is not set, fall back to mock data for demo mode.
- Never store API keys in plaintext client-side.

## Animation rules

- All animations must respect prefers-reduced-motion.
- Micro transitions: 150ms ease-out (borders, backgrounds, opacity).
- Expand/collapse: 200ms ease-in-out (decision card drawers).
- Page transitions: 250ms ease-out (route changes).
- New decision feed items: slide down 200ms + fade in.
- No decorative animations. Every animation communicates state change.

## Accessibility

- All text/background combinations must meet WCAG 2.1 AA (4.5:1 body, 3:1 large text).
- Focus rings: 2px solid var(--border-focus) on :focus-visible only.
- Status never communicated by color alone — badges include text labels, charts use solid vs dashed patterns.

## Security

- Never log API keys, wallet private keys, or session tokens to console.
- All secrets in .env.local. Never hardcode credentials.
- Validate all user input before processing (especially in simulate form).
- SIWE session tokens in httpOnly cookies only.

## Git conventions

- Use conventional commits: feat:, fix:, style:, refactor:, docs:
- Branch naming: feature/*, fix/*, chore/*
