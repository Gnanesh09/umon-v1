# PowerMoney

PowerMoney is a programmable USDC payments platform built on Solana. It combines on-chain escrow vaults, backend policy enforcement, merchant operations, and agentic payments through MCP.

This repository is a multi-package monorepo containing smart contracts, backend APIs, web frontend, SDK, and MCP server.

## System Overview

PowerMoney supports two primary operating modes:
- Human-driven commerce: merchants and operators use the web app for vaults, invoices, payment links, analytics, and admin workflows.
- Agent-driven commerce: AI agents use MCP tools to perform wallet and payment operations against backend guardrails.

Core architecture:

```text
Web Frontend (Next.js) / MCP Clients
              |
              v
        Backend API (Express)
      Auth + Policy + Business Logic
              |
   +----------+-----------+
   |                      |
   v                      v
Supabase (data/audit)   Solana Program (Anchor)
                            |
                            v
                       USDC Vault Flows
```

## Monorepo Structure

- `backend/` - Express TypeScript API, policy layer, analytics, notifications, payment links/sessions, invoices, agent-wallet endpoints
- `web-frontend/` - Next.js App Router UI for merchant/admin and payment experiences
- `smart-contracts/` - Anchor Solana program (`powermoney`) and tests
- `sdk/` - TypeScript SDK for program interactions
- `mcp-server/` - MCP stdio server exposing wallet/payment tools for AI agents

## Key Capabilities

- Programmable vaults with condition-based release logic
- Merchant and operator management
- Payment links and payment sessions
- Invoice generation and tracking
- Agent wallet operations via MCP
- Analytics and transaction history
- Notifications and admin operations

## Tech Stack

- Blockchain: Solana + Anchor
- Token rail: USDC/SPL token
- Backend: Node.js, Express, TypeScript, Supabase, BullMQ/Redis, JWT
- Frontend: Next.js, React, Tailwind, TanStack Query, Solana Wallet Adapter
- Agent integration: Model Context Protocol (MCP)

## Prerequisites

- Node.js 20+
- pnpm 9+
- Solana CLI 1.18.x
- Anchor CLI 0.30.x
- Rust stable toolchain
- Supabase project
- Redis (recommended for queue/worker flows)

## Workspace Commands

From repository root:

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm lint
```

Root scripts run recursively across workspace packages.

## Environment Setup

### 1) Backend (`backend/.env`)

Required and commonly used keys (as enforced by runtime schema):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SOLANA_RPC_URL`
- `PROGRAM_ID`
- `JWT_SECRET` (min 32 chars)
- `PORT` (default `3001`)

Optional but important by feature:
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

### 2) Web Frontend (`web-frontend/.env.local`)

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_PROGRAM_ID`

### 3) MCP Server (`mcp-server` env)

- `POWERMONEY_AGENT_TOKEN` (required)
- `POWERMONEY_API_URL` (optional; default `http://localhost:3001/api/v1`)

## Backend API Topology

Backend mounts API under `/api` and includes routes for:
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

Health endpoint:
- `GET /health`

## Smart Contracts

`smart-contracts/` contains Anchor program sources and test harness.

Typical flow:
1. Build and test Anchor program.
2. Deploy to target cluster (devnet/mainnet strategy as per your release process).
3. Propagate deployed `PROGRAM_ID` to backend and frontend env files.

## SDK

`sdk/` exposes program-level developer primitives including vault creation and condition helpers.

Typical usage:
- initialize `PowerMoney` client
- create vaults
- release/approve operations
- subscribe to vault events

## MCP Integration

`mcp-server/` is a dedicated stdio MCP adapter for agent wallets.

It:
- validates tool inputs using `zod`
- calls backend agent-wallet APIs (`/api/v1/agent-wallets/agent/*`)
- returns structured responses for MCP clients

Primary tool groups:
- wallet info and balances
- single/batch/scheduled payments
- vault operations
- payment links and invoices
- discovery and analytics

## Database and Migrations

You have SQL migration history under:
- `backend/db/migrations/`
- `backend/supabase/migrations/`

Initialize and apply migrations according to your Supabase migration workflow before running full features.

## Recommended Local Run Sequence

1. Configure Supabase and apply migrations.
2. Set all backend env vars and start backend.
3. Set frontend env vars and start web app.
4. Build/deploy smart contracts if `PROGRAM_ID` changes.
5. Start MCP server and connect with your MCP client.

## Security and Operational Guidance

- Never commit secrets (`.env`, tokens, service role keys)
- Use separate credentials for dev/staging/prod
- Enforce transaction guardrails in backend (limits, allowlists, policy checks)
- Keep auditable logs for payment/vault state transitions
- Rotate agent tokens and API keys regularly

## Architecture Document`r`n`r`n- `docs/ARCHITECTURE.md` - system diagrams and runtime flows`r`n- `docs/API-CONTRACTS.md` - backend endpoint contracts and envelope standards`r`n`r`n## Package-Level Documentation

- Backend: `backend/README.md`
- Web frontend: `web-frontend/README.md`
- Smart contracts: `smart-contracts/README.md`
- SDK: `sdk/README.md`
- MCP server: `mcp-server/README.md`

## Current Status Note

The monorepo is active and includes production-oriented modules, but environment provisioning (Supabase project, Solana program deployment, Redis availability, and secrets) determines full end-to-end readiness.

For team onboarding, use this README as the system map and module READMEs as execution detail.


