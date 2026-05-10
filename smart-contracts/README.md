# PowerMoney Smart Contracts

Anchor-based Solana program implementing programmable money vault logic for PowerMoney.

## Scope

`smart-contracts/` contains:
- On-chain program source (`programs/powermoney/src/lib.rs`)
- Anchor config and workspace metadata
- Program tests and migration scripts

## Requirements

- Solana CLI `1.18.x`
- Anchor CLI `0.30.x`
- Rust stable toolchain
- Node.js 20+ and pnpm

## Install

```bash
cd smart-contracts
pnpm install
```

## Build

```bash
anchor build
```

## Test

```bash
anchor test
```

## Deploy

Example devnet workflow:

```bash
solana config set --url https://api.devnet.solana.com
anchor deploy
```

After deploy, update program ID references consistently:
- `smart-contracts/Anchor.toml`
- `backend/.env` -> `PROGRAM_ID`
- `web-frontend/.env.local` -> `NEXT_PUBLIC_PROGRAM_ID`

## Integration Notes

- Backend uses this program for vault/payment policy execution paths.
- SDK wraps program instructions for app and service use.
- Frontend and backend must match deployed IDL/program ID.

## Related Docs`r`n`r`n- Architecture: `../docs/ARCHITECTURE.md` `r`n- API Contracts: `../docs/API-CONTRACTS.md`

- Root architecture: `../README.md`
- Backend API: `../backend/README.md`
- Web frontend: `../web-frontend/README.md`
- SDK: `../sdk/README.md`
- MCP server: `../mcp-server/README.md`


