# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this?

Umon (PowerMoney) is a programmable money protocol on Solana. Users lock USDC in on-chain vault PDAs with conditions (time-lock, auto-split, oracle triggers, milestone approvals) and funds release automatically when conditions are met. It also has a full payment gateway (payment links, invoices, checkout sessions) for merchants.

## Monorepo Structure

```
smart-contracts/   Anchor program (Rust) — vault PDAs, SPL token ops
backend/           Express API + BullMQ jobs + Helius indexer
web-frontend/      Next.js 16 App Router + React 19 + Tailwind
sdk/               TypeScript SDK for program interaction
```

Package manager: **pnpm 9** (workspace root). Node 20+.

## Commands

```bash
# Root — runs all packages in parallel
pnpm dev          # starts backend (tsx watch) + frontend (next dev)
pnpm build        # builds all packages
pnpm test         # runs vitest in backend
pnpm lint         # tsc --noEmit in backend, next lint in frontend

# Backend only (cd backend/)
pnpm dev          # tsx watch src/index.ts
pnpm build        # tsc -p tsconfig.json
pnpm test         # vitest run
pnpm lint         # tsc --noEmit

# Frontend only (cd web-frontend/)
pnpm dev          # next dev
pnpm build        # next build --webpack
npx tsc --noEmit  # type-check without building (fastest verification)

# Smart contracts (cd smart-contracts/)
anchor build
anchor test
```

## Backend Architecture

Express API with ESM (`"type": "module"` — all imports use `.js` extensions).

**Layered pattern**: `routes/ → controllers/ → services/ → supabase`

- **routes/** — Express routers, mount at `/api/v1/*` via `routes/index.ts`
- **controllers/** — request handling, calls services
- **services/** — business logic, Supabase queries
- **validators/** — Zod schemas used by `middleware/validate.ts`
- **middleware/** — `authenticate` (JWT Bearer), `requireRole`, `rateLimiter`, `errorHandler`
- **lib/** — `supabase.ts` (Supabase client), `solana.ts` (RPC connection), `logger.ts` (Pino)
- **queues/** — BullMQ job definitions (Redis-backed)

**Auth flow**: Wallet signs a nonce → backend verifies Ed25519 signature → issues JWT with `sub: walletAddress`. Frontend stores JWT in localStorage via `authStore`.

**API route prefix**: All routes are under `/api/v1/` (e.g., `/api/v1/vaults`, `/api/v1/payment-links`).

**Database**: Supabase (hosted PostgreSQL). Migrations in `backend/supabase/migrations/` numbered `002`–`006`. All tables have RLS enabled with service-role-only policies. No local Postgres — SQL runs directly on Supabase dashboard.

**Key services**:
- `PaymentMonitorService` — background scanner for session expiry, tx confirmation, auto-refund
- `AutoReleaserService` — checks time-lock conditions and triggers vault releases
- `OracleWatcherService` — monitors Pyth price feeds for oracle-triggered vaults
- `HeliusIndexerService` — processes Helius webhook payloads for on-chain events

## Frontend Architecture

Next.js 16 with App Router. All pages are `"use client"`.

**Route groups**:
- `/` — landing page (dark theme, self-contained)
- `/dashboard/*` — client portal (light theme, sidebar layout)
- `/merchant/*` — merchant portal (light theme, own layout)
- `/pay/[code]` — public checkout page (light theme, isolated layout)
- `/umon-admin/*` — admin panel

**State management**: Zustand — `stores/authStore.ts` (user/JWT), `store/uiStore.ts` (command palette)

**Data fetching**: TanStack React Query everywhere. API client at `lib/api.ts` (Axios with JWT interceptor).

**Wallet integration**: `@solana/wallet-adapter-react` wrapped in `providers/SolanaProvider.tsx` → `providers/AppProviders.tsx`. Wallet operations (SPL transfers, vault interactions) happen client-side using `@solana/web3.js` and `@solana/spl-token`.

**Component structure**: Atomic design — `components/atoms/`, `components/molecules/`, `components/organisms/`.

**Icons**: Lucide React (not emojis, not heroicons).

## CSS Theming

Global CSS in `web-frontend/app/globals.css`:
- **Root `:root` vars are light-themed** (white bg, dark text, gray borders)
- **Dark theme** scoped to `.theme-dark` class — used by Sidebar, mobile nav, and landing page
- The `.card` class has light/dark variants
- The `/pay/[code]/layout.tsx` adds `.pay-light` class + runtime body style overrides
- **Landing page** manages its own dark background via inline styles (doesn't use `.theme-dark`)
- `html, body { overflow: hidden }` globally — inner scroll areas use `.scroll-region`

When adding new pages: use Tailwind gray/white classes for light pages. Only add `.theme-dark` to elements that need the dark palette.

## Key Conventions

- Backend column names are `snake_case` (Postgres). Frontend types and API responses use `camelCase`. The backend controllers handle the transformation — when reading frontend code, expect camelCase properties.
- Amounts are stored as `BIGINT` in the database (lamports/micro-USDC: 1 USDC = 1,000,000). Display formatting via `lib/format.ts` (`formatUsdcRaw`, `truncateAddress`).
- Payment sessions have a 5-minute expiry window. The checkout page uses a `useCountdown` hook with a `-1` sentinel to distinguish "not started" from "expired".
- The `payingRef` ref in checkout prevents the expiry timer from firing during async wallet signing.
- Fee model: platform collects a fee (default 0.5%) as a separate SPL transfer in the same transaction. Fee logic in `lib/constants.ts` (`calculateFee`).
- Font: Open Sans (Google Fonts) for everything. The `font-cabinet` Tailwind class also maps to Open Sans.
