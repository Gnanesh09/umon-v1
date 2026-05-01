# PowerMoney Backend

## Environment

Copy `.env.example` to `.env` and provide values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SOLANA_RPC_URL`
- `HELIUS_API_KEY`
- `PROGRAM_ID`
- `JWT_SECRET`
- `REDIS_URL` (optional; required only for OracleWatcher BullMQ jobs)
- `PORT`
- `CHAINLINK_WEATHER_FEED`
- `PYTH_PRICE_FEED`
- `RESEND_API_KEY` (optional)

## Scripts

- `pnpm dev`: start dev server with watch
- `pnpm build`: compile TypeScript
- `pnpm start`: run compiled server
- `pnpm lint`: strict type-check

## Migrations

Run `backend/db/migrations/001_init.sql` in Supabase SQL editor.

## Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/nonce` | Wallet login nonce |
| POST | `/api/auth/verify` | Signature -> JWT |
| GET | `/api/auth/me` | Current user |
| GET | `/api/vaults` | List vaults |
| POST | `/api/vaults` | Create vault row |
| GET | `/api/vaults/:id` | Vault details |
| GET | `/api/vaults/:id/transactions` | Vault transactions |
| POST | `/api/vaults/:id/cancel` | Cancel vault |
| POST | `/api/vaults/:id/approve-milestone` | Milestone approval |
| POST | `/api/vaults/:id/raise-dispute` | Raise dispute |
| GET | `/api/merchants` | Merchant list |
| POST | `/api/merchants` | Register merchant |
| PUT | `/api/merchants/:id/verify` | Verify merchant |
| GET | `/api/analytics/overview` | Overview analytics |
| GET | `/api/analytics/daily` | Daily analytics |
| GET | `/api/analytics/user/:wallet` | Wallet analytics |
| GET | `/api/notifications` | Notification list |
| PUT | `/api/notifications/:id/read` | Mark read |
| PUT | `/api/notifications/read-all` | Mark all read |
