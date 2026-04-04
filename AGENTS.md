# PolicyMint — Project rules

## Overview

PolicyMint operator console. Next.js 14 App Router, TypeScript, Tailwind CSS, Vercel deployment. Crypto trading agent dashboard with policy enforcement.

## Tech stack

- Next.js 14 (App Router only)
- TypeScript (strict mode)
- Tailwind CSS + CSS custom properties
- recharts for data visualization
- connectkit/rainbowkit + siwe for wallet auth
- SWR or React Query for data fetching
- Supabase PostgreSQL (via REST API on Render backend)

## Code quality

- Functional components only
- Named exports preferred
- Files under 300 lines
- Interface for object shapes, type for unions
- All async operations wrapped in try/catch

## Styling

- ALWAYS use CSS variables from globals.css (--bg-*, --text-*, --border-*)
- NEVER hardcode hex color values in components
- Two font weights: 400 and 500 only
- Borders: 0.5px solid var(--border-default)
- No shadows, no gradients

## Security

- Secrets in .env.local only
- Never log keys or tokens
- SIWE auth, no passwords
- Validate all user input

## Git

- Conventional commits (feat:, fix:, docs:, refactor:)
