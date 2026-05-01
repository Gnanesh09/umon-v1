import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "HWgSd3Dd67ypxPYToXYATipRdcoPb3SJAc1EYyJyLoFg",
);

export const USDC_DEVNET_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_TOKEN_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export const EXPLORER_BASE = "https://explorer.solana.com";

export function explorerTxUrl(signature: string): string {
  return `${EXPLORER_BASE}/tx/${signature}?cluster=devnet`;
}

export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_BASE}/address/${address}?cluster=devnet`;
}

export const ORACLE_FEEDS: Record<string, { label: string; address: string }> = {
  sol_usd: {
    label: "SOL / USD",
    address: "J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix",
  },
  btc_usd: {
    label: "BTC / USD",
    address: "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J",
  },
  eth_usd: {
    label: "ETH / USD",
    address: "EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9GvYRFkFFkVWr",
  },
};

export const MERCHANT_CATEGORIES = [
  "Medical",
  "Education",
  "Food",
  "Construction",
  "Transport",
] as const;

export const TREASURY_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY_WALLET ?? "Cq5As4vNUHs4Hiw5EBTTkMdc5dHsst5YmzdDqkGXYP2f",
);

export const FEE_PERCENTAGE = Number(process.env.NEXT_PUBLIC_FEE_PERCENTAGE ?? 0.5);
export const FEE_MIN_LAMPORTS = Number(process.env.NEXT_PUBLIC_FEE_MIN_LAMPORTS ?? 10000);

export function calculateFee(amountLamports: number): number {
  const percentageFee = Math.floor(amountLamports * FEE_PERCENTAGE / 100);
  return Math.max(percentageFee, FEE_MIN_LAMPORTS);
}
