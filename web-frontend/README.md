# PowerMoney Web Frontend

Next.js frontend for merchant operations, admin workflows, and user-facing payment experiences in the PowerMoney platform.

## Scope

`web-frontend/` provides:
- Merchant dashboard flows
- Admin (`/umon-admin`) workflows
- Vault creation and monitoring UIs
- Payment link and invoice interfaces
- Wallet-integrated interactions for Solana users

## Tech Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- TanStack Query
- Solana Wallet Adapter
- Zustand store patterns

## Project Layout

- `app/` - App Router pages/layouts
- `components/` - atomic design components (atoms/molecules/organisms)
- `hooks/` - data and workflow hooks
- `lib/` - API clients, constants, formatting, anchor integration
- `providers/` - app/wallet provider wrappers
- `stores/` and `store/` - state management
- `types/` - shared frontend domain types

## Environment Configuration

Create `web-frontend/.env.local`:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_PROGRAM_ID`

## Install and Run

```bash
pnpm install
pnpm --filter @powermoney/web-frontend dev
```

Build + serve:

```bash
pnpm --filter @powermoney/web-frontend build
pnpm --filter @powermoney/web-frontend start
```

## Primary Route Areas

- `/` - landing
- `/dashboard/*` - core dashboard experience
- `/merchant/*` - merchant operations
- `/umon-admin/*` - admin operations
- `/pay/[code]` - payment link checkout flow

## API Integration Model

Frontend should call backend APIs only, not direct privileged service keys.

Recommended principles:
- Keep token/session logic server-safe.
- Use typed API clients and shared DTO shapes.
- Handle amount conversions consistently (micro-USDC vs display format).

## UX/State Notes

- Use React Query for fetch cache and mutation flows.
- Keep wallet state isolated in providers/hooks.
- Ensure loading/error states are explicit on financial actions.

## Related Docs`r`n`r`n- Architecture: `../docs/ARCHITECTURE.md` `r`n- API Contracts: `../docs/API-CONTRACTS.md`

- Root architecture: `../README.md`
- Backend API: `../backend/README.md`
- Smart contracts: `../smart-contracts/README.md`
- SDK: `../sdk/README.md`
- MCP server: `../mcp-server/README.md`


