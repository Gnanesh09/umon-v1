# PowerMoney Backend

Backend API and policy engine for PowerMoney. This service is the control plane that coordinates authentication, merchant operations, vault/payment workflows, analytics, and agent-wallet operations.

## Scope

`backend/` provides:
- REST APIs under `/api/*`
- Auth and authorization middleware
- Business policy enforcement and validations
- Supabase persistence and query layer
- Queue/worker-oriented services (where configured)
- Integrations with Solana, Helius, and notification providers

## Tech Stack

- Node.js + Express
- TypeScript (ESM)
- Supabase (`@supabase/supabase-js`)
- Solana + Anchor client dependencies
- BullMQ + Redis (feature-dependent)
- JWT auth and zod validation

## Project Layout

- `src/app.ts` - Express app wiring, middleware, `/api` mount, `/health`
- `src/index.ts` - bootstrap entrypoint
- `src/routes/` - route modules
- `src/controllers/` - HTTP controller layer
- `src/services/` - business/integration services
- `src/validators/` - zod input schemas
- `src/middleware/` - auth, rate limiting, error handling
- `src/lib/` - shared clients/utilities (Supabase/Solana/logger)
- `db/migrations/` and `supabase/migrations/` - SQL migration history

## Environment Configuration

Create `backend/.env` with at least:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SOLANA_RPC_URL`
- `PROGRAM_ID`
- `JWT_SECRET` (minimum 32 chars)

Common optional keys:
- `HELIUS_API_KEY`
- `REDIS_URL`
- `CHAINLINK_WEATHER_FEED`
- `PYTH_PRICE_FEED`
- `RESEND_API_KEY`
- `AUTHORITY_KEYPAIR`
- `TREASURY_WALLET`
- `FEE_PERCENTAGE`
- `FEE_MIN_USDC`
- `ADMIN_CODE`
- `PORT` (default `3001`)

## Install and Run

```bash
pnpm install
pnpm --filter @powermoney/backend dev
```

Build + start:

```bash
pnpm --filter @powermoney/backend build
pnpm --filter @powermoney/backend start
```

Type-check/lint:

```bash
pnpm --filter @powermoney/backend lint
```

Tests:

```bash
pnpm --filter @powermoney/backend test
```

## API Surface

Mounted under `/api`:
- `/auth`
- `/vaults`
- `/merchants`
- `/analytics`
- `/notifications`
- `/transactions`
- `/fees`
- `/admin`
- `/payment-links`
- `/payment-sessions`
- `/invoices`
- `/refunds`
- `/qr`
- `/developer`
- `/agent-wallets`

Health:
- `GET /health`

## MCP Dependency Path

The MCP server calls backend endpoints under:
- `/api/v1/agent-wallets/agent/*`

Backend response envelope must remain stable:

```json
{ "success": true, "data": {} }
```

or

```json
{ "success": false, "error": { "message": "...", "code": "..." } }
```

## Operational Notes

- Keep policy enforcement backend-side (limits, allowlists, category controls).
- Use structured logs and correlation IDs for tracing.
- Protect privileged endpoints with strong auth + role checks.
- Run migrations before feature validation.

## Related Docs`r`n`r`n- Architecture: `../docs/ARCHITECTURE.md` `r`n- API Contracts: `../docs/API-CONTRACTS.md`

- Root architecture: `../README.md`
- Web client: `../web-frontend/README.md`
- Smart contracts: `../smart-contracts/README.md`
- SDK: `../sdk/README.md`
- MCP server: `../mcp-server/README.md`


