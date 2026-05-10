# API Contracts

Canonical API contract reference for PowerMoney backend clients (web, SDK adapters, MCP server).

Base URL pattern:
- Local: `http://localhost:3001`
- API root: `/api`

## Response Envelope Standard

Success envelope:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "cursor": "optional",
    "hasMore": true
  }
}
```

`meta` is optional and returned for paginated/list responses as needed.

Error envelope:

```json
{
  "success": false,
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Unhandled server errors use:
- `code`: `INTERNAL_SERVER_ERROR`
- HTTP status: `500`

## Authentication Model

Supported auth patterns:
- User JWT auth: `Authorization: Bearer <jwt>`
- Agent token auth (MCP/agent flows): `Authorization: Bearer <agent_token>`

Typical route protection:
- Public endpoints: no auth required
- `authenticate` middleware: user JWT required
- `adminAuth` middleware: admin authorization required

## HTTP Status Conventions

- `200` OK: successful read or state update
- `201` Created: new resource created
- `400` Bad Request: validation/business input failure
- `401` Unauthorized: missing/invalid auth
- `403` Forbidden: insufficient permissions
- `404` Not Found: resource missing
- `409` Conflict: business state conflict
- `500` Internal Server Error

## Core Route Groups

All routes are mounted under `/api`.

### Health

- `GET /health`

### Auth (`/api/auth`)

- `POST /nonce`
- `POST /verify`
- `GET /me`
- `PUT /me`

### Vaults (`/api/vaults`)

- `GET /`
- `POST /`
- `GET /claimable`
- `GET /:id`
- `GET /:id/transactions`
- `POST /:id/cancel`
- `POST /:id/claim`
- `POST /:id/approve-milestone`
- `POST /:id/raise-dispute`
- `GET /:id/dispute`
- `POST /:id/vote-dispute`
- `POST /:id/record-action`

### Merchants (`/api/merchants`)

- `GET /`
- `GET /me/current`
- `GET /me/all`
- `POST /register`
- `PUT /:id`
- `PUT /:id/approve`
- `PUT /:id/reject`
- `PUT /:id/suspend`
- `GET /:id`

### Analytics (`/api/analytics`)

- `GET /overview`
- `GET /daily`
- `GET /user/:wallet`

### Notifications (`/api/notifications`)

- `GET /`
- `PUT /:id/read`
- `PUT /read-all`

### Transactions (`/api/transactions`)

- `GET /`

### Fees (`/api/fees`)

- `GET /`
- `GET /summary`
- `GET /receipts`
- `GET /receipts/:txSignature`
- `GET /receipts/:txSignature/html`
- `POST /receipts/:id/email`

### Admin (`/api/admin`)

- `GET /stats`
- `GET /users`
- `PUT /users/:id/role`
- `GET /fees`
- `GET /activity`
- `GET /notifications`
- `PUT /notifications/:id/read`

### Payment Links (`/api/payment-links`)

- `GET /code/:shortCode`
- `GET /collections`
- `POST /`
- `GET /`
- `GET /:id`
- `PUT /:id`
- `DELETE /:id`

### Payment Sessions (`/api/payment-sessions`)

- `POST /`
- `GET /:id`
- `PUT /:id/pay`

### Invoices (`/api/invoices`)

- `GET /view/:invoiceNumber` (public invoice view)
- `POST /`
- `GET /`
- `GET /:id`
- `PUT /:id/send`
- `PUT /:id/cancel`

### Refunds (`/api/refunds`)

- `POST /`
- `GET /`

### QR (`/api/qr`)

- `GET /:shortCode`

### Developer (`/api/developer`)

- `POST /api-keys`
- `GET /api-keys`
- `PUT /api-keys/:id/revoke`
- `POST /webhooks`
- `GET /webhooks`
- `DELETE /webhooks/:id`

### Agent Wallets (`/api/agent-wallets`)

Owner-authenticated endpoints:
- `POST /`
- `GET /`
- `GET /:id`
- `PUT /:id/limits`
- `POST /:id/pay`
- `POST /:id/freeze`
- `POST /:id/unfreeze`
- `POST /:id/revoke`
- `POST /:id/regenerate-token`
- `GET /:id/transactions`

Agent-token endpoints (used by MCP/agents):
- `GET /agent/info`
- `GET /agent/balance`
- `POST /agent/pay`
- `GET /agent/transactions`
- `POST /agent/batch-pay`
- `POST /agent/schedule`
- `GET /agent/scheduled`
- `DELETE /agent/scheduled/:txId`
- `POST /agent/vaults`
- `GET /agent/vaults`
- `GET /agent/vaults/:id`
- `POST /agent/payment-links`
- `GET /agent/payment-links`
- `DELETE /agent/payment-links/:id`
- `POST /agent/pay-link`
- `POST /agent/invoices`
- `GET /agent/invoices`
- `GET /agent/discover-merchants`
- `GET /agent/analytics`

## MCP Mapping

The MCP server forwards tool calls to:
- `${POWERMONEY_API_URL}/agent-wallets/agent/*`

Typical mappings:
- `check_balance` -> `GET /agent-wallets/agent/balance`
- `wallet_info` -> `GET /agent-wallets/agent/info`
- `pay` -> `POST /agent-wallets/agent/pay`
- `batch_pay` -> `POST /agent-wallets/agent/batch-pay`
- `schedule_payment` -> `POST /agent-wallets/agent/schedule`
- `list_scheduled_payments` -> `GET /agent-wallets/agent/scheduled`
- `cancel_scheduled_payment` -> `DELETE /agent-wallets/agent/scheduled/:txId`
- `create_vault` -> `POST /agent-wallets/agent/vaults`
- `list_vaults` -> `GET /agent-wallets/agent/vaults`
- `get_vault` -> `GET /agent-wallets/agent/vaults/:id`
- `create_payment_link` -> `POST /agent-wallets/agent/payment-links`
- `list_payment_links` -> `GET /agent-wallets/agent/payment-links`
- `deactivate_payment_link` -> `DELETE /agent-wallets/agent/payment-links/:id`
- `pay_link` -> `POST /agent-wallets/agent/pay-link`
- `create_invoice` -> `POST /agent-wallets/agent/invoices`
- `list_invoices` -> `GET /agent-wallets/agent/invoices`
- `discover_merchants` -> `GET /agent-wallets/agent/discover-merchants`
- `spending_analytics` -> `GET /agent-wallets/agent/analytics`

## Example Request/Response

Example: create payment link (authenticated endpoint)

Request:

```http
POST /api/payment-links
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "title": "Monthly subscription",
  "description": "Pro plan",
  "amountUsdc": 5000000,
  "maxUses": 100
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "shortCode": "abc123",
    "url": "https://app.example.com/pay/abc123",
    "status": "active"
  }
}
```

## Contract Governance

When modifying routes, payloads, or envelopes:
1. Update this document in the same PR.
2. Keep backward compatibility for MCP agent endpoints whenever possible.
3. Version and communicate breaking changes before deployment.
