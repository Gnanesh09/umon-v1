# MCP README

Detailed reference for the PowerMoney MCP server implementation in this repository.

## Service Identity

- Name: `powermoney`
- Version: `2.0.0`
- Transport: `stdio`
- Runtime: Node.js ESM

## Startup Requirements

Required environment variable:
- `POWERMONEY_AGENT_TOKEN`

Optional environment variable:
- `POWERMONEY_API_URL` (default `http://localhost:3001/api/v1`)

On startup, if token is missing, server exits with status `1` and prints a clear error.

## Request Routing Model

Each MCP tool maps to backend API path:
- Final URL pattern: `${POWERMONEY_API_URL}/agent-wallets/agent${path}`

All outbound requests include:
- `Authorization: Bearer <POWERMONEY_AGENT_TOKEN>`
- `Content-Type: application/json`

## Output Contract to MCP Client

Success:
- Returns `content` with one text block containing prettified JSON.

Failure:
- Returns `content` with `Error: <message>` and `isError: true`.

## Tool Catalog

### Core Wallet
- `check_balance`
- `wallet_info`
- `format_usdc`

### Payments
- `pay`
- `batch_pay`
- `schedule_payment`
- `list_scheduled_payments`
- `cancel_scheduled_payment`

### Vaults (Escrow)
- `create_vault`
- `list_vaults`
- `get_vault`

### Payment Links
- `create_payment_link`
- `list_payment_links`
- `deactivate_payment_link`
- `pay_link`

### Invoices
- `create_invoice`
- `list_invoices`

### Discovery
- `discover_merchants`

### Analytics and History
- `list_transactions`
- `spending_analytics`

## Parameter Validation

Validation is enforced via `zod` schemas per tool:
- Positive integer validation for micro-USDC amounts
- Enum restriction for known options (condition types, operators, statuses)
- Collection bounds (example: `batch_pay` supports max 10 payments)
- Optional fields for flexible payloads

## Amount Handling

USDC is handled in micro-units for transactional accuracy:
- `1 USDC = 1,000,000 micro-USDC`

Use `format_usdc` tool to convert:
- `to_micro`: human -> micro
- `to_human`: micro -> human

## Local Development

Install and run:

```bash
npm install
npm run dev
```

Build and run compiled output:

```bash
npm run build
npm start
```

## Operational Recommendations

- Keep this server stateless.
- Enforce financial guardrails in backend, not only in MCP layer.
- Use separate tokens per environment.
- Add monitoring around tool-level failure rates.

## Source of Truth

Implementation file:
- `src/index.ts`

Package/build configuration:
- `package.json`
- `tsconfig.json`
