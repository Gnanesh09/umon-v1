# @powermoney/sdk

## Install

```bash
npm install @powermoney/sdk
```

## Usage

```ts
import { PowerMoney, Conditions } from "@powermoney/sdk";
```

### 1) Initialize

```ts
const sdk = new PowerMoney({ rpcUrl, programId, wallet, idl });
```

### 2) Create Vault

```ts
await sdk.createVault({
  recipient,
  amountUsdc: 100_000_000,
  description: "Freelance payout",
  conditions: [Conditions.timeLock(new Date(Date.now() + 86400000), 100)],
});
```

### 3) Release Time Lock

```ts
await sdk.releaseTimeLock(vaultAddress, 0);
```

### 4) Approve Milestone

```ts
await sdk.approveMilestone(vaultAddress, 0);
```

### 5) Subscribe to Events

```ts
const unsubscribe = sdk.onVaultEvent(vaultAddress, (event) => console.log(event));
```

## API

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