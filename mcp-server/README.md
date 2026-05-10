# PowerMoney MCP Server

MCP stdio server that exposes PowerMoney agent-wallet and payment operations as tools for AI agents.

## Scope

`mcp-server/` provides:
- MCP tool registration and schemas
- Input validation (`zod`)
- Backend API forwarding for agent-wallet endpoints
- Normalized MCP output/error responses

## Runtime and Identity

- Transport: `stdio`
- MCP server name: `powermoney`
- Implementation: TypeScript + `@modelcontextprotocol/sdk`

## Environment Configuration

Required:
- `POWERMONEY_AGENT_TOKEN`

Optional:
- `POWERMONEY_API_URL` (default `http://localhost:3001/api/v1`)

If `POWERMONEY_AGENT_TOKEN` is missing, startup exits with explicit error.

## Install and Run

```bash
pnpm install
pnpm --filter @powermoney/mcp-server build
pnpm --filter @powermoney/mcp-server start
```

Development:

```bash
pnpm --filter @powermoney/mcp-server dev
```

## Backend Contract

MCP tool calls are forwarded to:
- `${POWERMONEY_API_URL}/agent-wallets/agent/*`

Expected backend envelope:

```json
{ "success": true, "data": {} }
```

or

```json
{ "success": false, "error": { "message": "...", "code": "..." } }
```

## Tool Groups

- Core wallet (`check_balance`, `wallet_info`, `format_usdc`)
- Payments (single/batch/scheduled/cancel/list)
- Vaults (create/list/detail)
- Payment links (create/list/deactivate/pay)
- Invoices (create/list)
- Discovery (`discover_merchants`)
- Analytics/history (`list_transactions`, `spending_analytics`)

## MCP Client Config Example

```json
{
  "mcpServers": {
    "powermoney": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "POWERMONEY_AGENT_TOKEN": "your_agent_token",
        "POWERMONEY_API_URL": "http://localhost:3001/api/v1"
      }
    }
  }
}
```

## Related Docs`r`n`r`n- Architecture: `../docs/ARCHITECTURE.md` `r`n- API Contracts: `../docs/API-CONTRACTS.md`

- Root architecture: `../README.md`
- Backend API: `../backend/README.md`
- Web frontend: `../web-frontend/README.md`
- Smart contracts: `../smart-contracts/README.md`
- SDK: `../sdk/README.md`
- Extended MCP docs: `docs/mcp/README.md`


