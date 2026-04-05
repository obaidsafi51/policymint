# PolicyMint — Antigravity project rules

## Project context

PolicyMint is a policy-protected autonomous crypto trading agent dashboard. The operator console is a Next.js 14 App Router frontend deployed on Vercel Free Tier. The backend runs on Render (Node.js/Express) with Supabase PostgreSQL. The agent executes trades via Kraken CLI and ERC-8004 Risk Router while enforcing real-time policy guardrails (spend caps, venue allowlists, daily loss budgets).

Do NOT restructure, rename, or reorganize existing files, components, or folder structure. Build on top of what exists.

## Design system

All visual rules are defined in **DESIGN.md** at the project root. DESIGN.md is the single source of truth for: colors, semantic tokens, typography, spacing, border radius, layout grid, component specs, state rules (active, inactive, hover, focus, restricted, loading, error), iconography, motion, dark mode, and usage guidelines.

Read DESIGN.md before writing or modifying any component. If code contradicts DESIGN.md, the code is wrong.

Key rules to never violate (see DESIGN.md for full specs):
- ALWAYS use CSS variables (`var(--token-name)`), NEVER hardcode hex values in components
- Two font weights only: 400 and 500. Never use 600 or 700.
- Restricted/unavailable items: `opacity: 0.4; filter: grayscale(1); pointer-events: none`
- Brand mint (`#34D399`) is for identity. Success emerald (`#22C55E`) is for status. Never swap them.
- All on-chain data in monospace font. Addresses truncated: first 4 + last 4 chars.

## Tech stack

- Framework: Next.js 14 with App Router (NOT Pages Router)
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS + CSS custom properties (design tokens in globals.css)
- Charts: recharts
- Wallet: connectkit or rainbowkit + siwe for Sign-In With Ethereum
- Data fetching: SWR or React Query
- Deploy target: Vercel Free Tier
- Fonts: Inter (sans-serif), JetBrains Mono (monospace) via next/font/google

## Code conventions

### File structure
- Functional components only. No class components.
- Named exports preferred over default exports.
- Files under 300 lines. Split into smaller modules if needed.
- Use `interface` for object shapes, `type` for unions and intersections.
- All async operations wrapped in try/catch with error state handling.

### Component patterns
- One component per file.
- Props interface defined directly above the component.
- Hooks at the top of the component body, before any conditionals.
- No inline styles — use Tailwind utilities or CSS variables only.
- Destructure props in the function signature.

### Naming
- Components: PascalCase (`MetricTile.tsx`, `DecisionCard.tsx`)
- Hooks: camelCase with `use` prefix (`useAgent.ts`, `usePolicyEngine.ts`)
- Utils: camelCase (`formatAddress.ts`, `evaluatePolicy.ts`)
- Types: PascalCase (`TradeIntent`, `PolicyDecision`, `AgentConfig`)
- CSS variables: kebab-case with semantic prefix (`--bg-card`, `--text-brand`)

## Data fetching

- Use SWR or React Query for all API calls.
- API base URL from `NEXT_PUBLIC_API_URL` environment variable.
- Real-time decision feed: use EventSource (SSE), fall back to 10-second polling.
- If `NEXT_PUBLIC_API_URL` is not set, fall back to mock data for demo mode.
- Never store API keys in plaintext client-side.

## Animation rules

All animation specs are defined in DESIGN.md section 8. Key code rules:
- All animations must respect `prefers-reduced-motion`.
- No decorative animations. Every animation communicates state change.
- Use CSS transitions for micro interactions, not JavaScript.

## Accessibility

Full accessibility rules are in DESIGN.md section 10. Key code rules:
- Focus rings on `:focus-visible` only, not `:focus`.
- All interactive elements must be keyboard-accessible.
- Use semantic HTML for tables, buttons, forms.
- Status never communicated by color alone — always pair with text labels or patterns.

## Security

- Never log API keys, wallet private keys, or session tokens to console.
- All secrets in `.env.local`. Never hardcode credentials.
- Validate all user input before processing (especially in simulate form).
- SIWE session tokens in httpOnly cookies only.
- No PII collected from agents.

## Git conventions

- Use conventional commits: `feat:`, `fix:`, `style:`, `refactor:`, `docs:`
- Branch naming: `feature/*`, `fix/*`, `chore/*`
