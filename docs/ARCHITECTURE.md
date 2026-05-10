# PowerMoney Architecture

This document explains the end-to-end architecture and runtime interaction patterns across Web, Backend, Smart Contracts, SDK, and MCP.

## High-Level Architecture

```text
                    +-----------------------+
                    |   MCP Clients / AI    |
                    +-----------+-----------+
                                |
                                v
+-------------------+   +-------+--------+   +----------------------+
|   Web Frontend    +--->   Backend API  +--->      Supabase        |
|   (Next.js)       |   |   (Express)    |   |  Postgres + Storage  |
+-------------------+   +-------+--------+   +----------------------+
                                |
                                v
                       +--------+---------+
                       | Solana Program   |
                       | (Anchor)         |
                       +--------+---------+
                                |
                                v
                          USDC Vault Logic
```

## Sequence 1: Web User Payment/Vault Flow

```text
User -> Web Frontend: Fill form (vault/payment/invoice)
Web Frontend -> Backend API: POST /api/... request
Backend API -> Validators/Policy: zod + business checks
Backend API -> Supabase: persist intent/metadata
Backend API -> Solana Program: submit tx (when on-chain action needed)
Solana Program -> Backend API: tx signature / result available
Backend API -> Supabase: update state + audit trail
Backend API -> Web Frontend: success/error response
Web Frontend -> User: status, signature, updated dashboard
```

## Sequence 2: MCP Agent Wallet Flow

```text
AI Agent -> MCP Client Host: invoke tool (e.g., pay, check_balance)
MCP Client Host -> MCP Server (stdio): tool call payload
MCP Server -> zod Schema: validate inputs
MCP Server -> Backend API: /api/v1/agent-wallets/agent/*
Backend API -> Policy Engine: limits/allowlists/category checks
Backend API -> Solana Program: execute when required
Backend API -> MCP Server: { success, data } or { success:false, error }
MCP Server -> MCP Client Host: normalized MCP response
MCP Client Host -> AI Agent: tool result
```

## Sequence 3: Vault Lifecycle

```text
1) Create
   Actor -> Backend/API/SDK -> Program: create vault + conditions
   Program -> Backend: vault address + tx data
   Backend -> DB: vault row, conditions, status=active

2) Monitor
   Backend services/watchers observe:
   - time lock maturity
   - milestone approvals
   - oracle triggers
   - category claim evidence

3) Release/Partial Release
   Eligible actor/service -> Program instruction
   Program updates vault balances/state
   Backend indexes tx + updates status (released/partially_released)

4) Exceptional States
   Dispute/cancel paths recorded in backend and reflected in UI/analytics.
```

## Data and Control Boundaries

- Frontend: user interaction and visualization only.
- Backend: source of policy truth, auth, audit, orchestration.
- Smart contract: deterministic escrow/state transition logic on-chain.
- SDK: typed program-access abstraction for app/service developers.
- MCP server: agent-facing adapter, not policy authority.

## Operational Design Principles

- Enforce spend and recipient guardrails in backend.
- Keep response envelope stable for MCP and frontend clients.
- Maintain immutable-like audit logs for financial actions.
- Propagate `PROGRAM_ID` and IDL changes consistently to all modules.
- Use environment isolation (dev/stage/prod) with separate secrets/tokens.
