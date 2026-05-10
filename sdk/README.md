# PowerMoney SDK

TypeScript SDK for interacting with the PowerMoney Solana program.

## Scope

`sdk/` offers developer-friendly wrappers for:
- Vault creation and condition modeling
- Release and approval operations
- Program data access
- Event subscription patterns

## Install

```bash
npm install @powermoney/sdk
```

## Initialize

```ts
import { PowerMoney } from "@powermoney/sdk";

const sdk = new PowerMoney({ rpcUrl, programId, wallet, idl });
```

## Typical Usage

Create vault:

```ts
import { Conditions } from "@powermoney/sdk";

await sdk.createVault({
  recipient,
  amountUsdc: 100_000_000,
  description: "Freelance payout",
  conditions: [Conditions.timeLock(new Date(Date.now() + 86_400_000), 100)],
});
```

Release/approve:

```ts
await sdk.releaseTimeLock(vaultAddress, 0);
await sdk.approveMilestone(vaultAddress, 0);
```

Events:

```ts
const unsubscribe = sdk.onVaultEvent(vaultAddress, (event) => {
  console.log(event);
});
```

## Exported Surface (Current)

- `createVault`
- `releaseTimeLock`
- `approveMilestone`
- `executeAutoSplit`
- `getVault`
- `onVaultEvent`
- `Conditions.timeLock`
- `Conditions.milestone`
- `Conditions.autoSplit`
- `Conditions.oracleTrigger`
- `Conditions.categoryRestrict`

## Development

From monorepo root:

```bash
pnpm --filter @powermoney/sdk build
```

## Compatibility Notes

- `programId` and IDL must match deployed smart contract version.
- Wallet adapter/signing context must be valid for transaction submission.

## Related Docs`r`n`r`n- Architecture: `../docs/ARCHITECTURE.md` `r`n- API Contracts: `../docs/API-CONTRACTS.md`

- Root architecture: `../README.md`
- Smart contracts: `../smart-contracts/README.md`
- Backend API: `../backend/README.md`
- Web frontend: `../web-frontend/README.md`
- MCP server: `../mcp-server/README.md`


