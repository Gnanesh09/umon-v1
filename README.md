# PowerMoney

PowerMoney is a programmable money protocol on Solana where USDC is locked in vault PDAs and released only when policy conditions are met.

## Architecture

```text
+------------------+      +------------------+      +----------------------+
|  web-frontend    | <--> |     backend      | <--> |     Supabase         |
| Next.js + Wallet |      | Express + Queue  |      | PostgreSQL + storage |
+---------+--------+      +---------+--------+      +----------------------+
          |                         |
          |                         v
          |               +------------------+
          +-------------> | Solana Program   |
                          | Anchor powermoney|
                          +---------+--------+
                                    |
                                    v
                              SPL Token Vaults
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Rust stable + Solana 1.18.x toolchain
- Anchor CLI 0.30.x
- Redis (for BullMQ)
- Supabase project

## Quick Start

```bash
pnpm install
pnpm -r build
pnpm dev
```

## Monorepo

- `smart-contracts/`: Anchor program + tests
- `backend/`: Express API + jobs + Helius indexer hooks
- `web-frontend/`: Next.js App Router client
- `sdk/`: TypeScript SDK