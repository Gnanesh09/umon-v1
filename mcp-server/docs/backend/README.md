# Backend Integration README

This document defines the backend contract required by the PowerMoney MCP server.

## Purpose

The MCP server is a thin adapter. All wallet, payment, compliance, and ledger logic must be implemented in backend APIs.

Base path expected by MCP server:
- `${POWERMONEY_API_URL}/agent-wallets/agent/*`

Default local value:
- `http://localhost:3001/api/v1/agent-wallets/agent/*`

## Required Backend Response Shape

All endpoints must return JSON in this envelope:

```json
{
  "success": true,
  "data": {}
}
```

Error format:

```json
{
  "success": false,
  "error": {
    "message": "Readable error message",
    "code": "OPTIONAL_MACHINE_CODE"
  }
}
```

## Authentication

The MCP server sends:
- `Authorization: Bearer <POWERMONEY_AGENT_TOKEN>`
- `Content-Type: application/json`

Backend must:
- Validate token authenticity
- Resolve agent identity and wallet context
- Enforce tenant isolation

## Endpoint Contract Used by MCP

Core wallet:
- `GET /balance`
- `GET /info`

Payments:
- `POST /pay`
- `POST /batch-pay`
- `POST /schedule`
- `GET /scheduled`
- `DELETE /scheduled/:transactionId`

Vaults:
- `POST /vaults`
- `GET /vaults`
- `GET /vaults/:vaultId`

Payment links:
- `POST /payment-links`
- `GET /payment-links`
- `DELETE /payment-links/:linkId`
- `POST /pay-link`

Invoices:
- `POST /invoices`
- `GET /invoices`

Discovery:
- `GET /discover-merchants`

Analytics:
- `GET /transactions`
- `GET /analytics`

## Business Rules (Recommended Minimum)

Implement guardrails server-side (never only in MCP/client):
- Daily spending cap
- Per-transaction cap
- Allowed recipient list
- Allowed payment categories
- Wallet status checks (active/suspended)

For scheduled payments:
- Validate at creation and execution time
- Persist idempotency keys/jobs
- Store execution/audit metadata

For vaults:
- Validate condition schemas rigorously
- Ensure percentages and splits are sane
- Track partial releases and dispute states

## Data and Ledger Expectations

Minimum persistent entities:
- Agents
- Wallets
- Transactions
- Scheduled transactions
- Vaults and vault conditions
- Payment links
- Invoices and line items
- Merchant registry entries
- Audit logs

## Operational Setup

Recommended environment variables for backend:
- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET` or token verification config
- Solana RPC settings
- USDC mint configuration
- Queue/worker configuration for scheduled jobs

## Validation and Error Semantics

- Return deterministic error messages for policy violations.
- Use stable `error.code` values for programmatic handling.
- Keep HTTP status aligned with error class (4xx for client/policy, 5xx for server/infrastructure).

## Performance and Reliability

- Add request timeouts and retries for blockchain/RPC dependencies.
- Use idempotency for payment-creating endpoints.
- Log correlation IDs for cross-service tracing.
- Emit metrics for success rate, latency, and failure causes.

## Security Checklist

- Rotate agent tokens
- Encrypt sensitive data at rest
- Restrict CORS for web surfaces
- Add rate limits and abuse detection
- Maintain complete financial audit logs

## Local Backend Validation with MCP

1. Start backend on `http://localhost:3001/api/v1` (or update `POWERMONEY_API_URL`).
2. Export a valid `POWERMONEY_AGENT_TOKEN`.
3. Run MCP server and execute tools like `check_balance`, `wallet_info`, `pay`.
4. Verify backend response envelope and business enforcement.
