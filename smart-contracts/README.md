# PowerMoney Smart Contracts

## Requirements

- Solana CLI `1.18.x`
- Anchor CLI `0.30.x`
- Rust stable toolchain

## Build

```bash
cd smart-contracts
pnpm install
anchor build
```

## Test

```bash
anchor test
```

## Deploy to Devnet

```bash
solana config set --url https://api.devnet.solana.com
anchor deploy
```

After deploy, copy the deployed program id into:

- `smart-contracts/Anchor.toml` `[programs.devnet].powermoney`
- `backend/.env` `PROGRAM_ID`
- `web-frontend/.env.local` `NEXT_PUBLIC_PROGRAM_ID`