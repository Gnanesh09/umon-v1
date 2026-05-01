# PowerMoney Web Frontend

## Environment

Copy `.env.example` to `.env.local`:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_PROGRAM_ID`

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm start`

## Pages

- `/` landing
- `/dashboard` home metrics
- `/dashboard/create` create payment wizard
- `/dashboard/vaults` vault list
- `/dashboard/vaults/[id]` vault detail
- `/dashboard/merchants` merchants
- `/dashboard/analytics` analytics
- `/dashboard/settings` settings

## Components

- Atoms: `Button`, `Input`, `Badge`
- Molecules: `KPICard`, `VaultCard`
- Organisms: `Sidebar`, `Header`, `CreateVaultWizard`