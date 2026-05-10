# Web Integration README

This document describes how a web app should integrate with the PowerMoney backend and MCP-powered agent workflows.

## Scope

No web source code is present in this repository. This guide defines the expected frontend capabilities, data flows, and implementation standards.

## Product Surfaces

Recommended web modules:
- Agent management (create/revoke tokens, wallet status)
- Wallet dashboard (USDC/SOL balances, limits, remaining daily budget)
- Payments (single, batch, scheduled)
- Vault management (create, monitor, release/dispute states)
- Payment links (create, share, disable, usage tracking)
- Invoice management
- Merchant discovery
- Analytics and transaction history

## API Integration

Frontend should call backend APIs, not MCP directly.

Why:
- Browser cannot safely hold privileged agent tokens
- Backend centralizes authentication, policy checks, and audit logging

## Authentication and Authorization

Implement:
- Session or OAuth-based user auth
- Role-based access control (owner/admin/operator/viewer)
- Scoped operations by merchant/team/workspace

Never expose raw agent token in frontend JS bundles.

## UX and Data Modeling Recommendations

Amounts:
- Store/submit values in micro-USDC integers
- Display converted human USDC with formatting

Dates:
- Store as ISO 8601 UTC
- Render with user locale/timezone

Statuses:
- Standardize enum badges (pending/success/failed/cancelled/scheduled)

## Core User Flows

1. Wallet Dashboard
- Fetch `balance` and `info`-equivalent data from backend
- Show current spend, limits, and risk state

2. Send Payment
- Validate recipient format and amount
- Submit to backend
- Show transaction signature and policy decisions

3. Schedule Payment
- Date/time picker with timezone clarity
- Confirmation screen showing exact UTC execution time

4. Vault Creation
- Guided condition builder for `time_lock`, `milestone`, `oracle`, `auto_split`, `category`
- Real-time validation for split percentages and condition completeness

5. Payment Links + Invoices
- Link generation screen
- Copy/share actions
- Usage and payment status tracking

## Suggested Frontend Stack

Recommended baseline:
- Next.js or React + Vite
- TypeScript
- Query layer (TanStack Query/SWR)
- Form validation (zod + react-hook-form)
- Component system with design tokens

## Observability

Track:
- API latency and errors
- User action funnels (payment submit -> success)
- Failed policy checks by reason

Log with correlation IDs passed from backend when available.

## Testing Strategy

- Unit tests for amount/date conversion helpers
- Integration tests for payment and scheduling forms
- E2E tests for critical money flows
- Contract tests against backend envelope `{ success, data, error }`

## Deployment Considerations

- Use environment-specific API base URLs
- Enforce HTTPS in all environments beyond local dev
- Add CSP and secure cookie settings
- Provide graceful degradation for RPC/chain delays

## MCP Relationship

MCP is primarily for agentic automation and assistant-driven operations.
Web app remains the human operator surface, while backend enforces one consistent policy layer for both channels.
