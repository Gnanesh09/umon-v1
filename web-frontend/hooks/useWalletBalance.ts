"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { Connection } from "@solana/web3.js";
import { USDC_DEVNET_MINT } from "@/lib/constants";

export function useWalletBalance(): ReturnType<typeof useQuery> {
  const wallet = useWallet();

  return useQuery({
    queryKey: ["walletBalance", wallet.publicKey?.toBase58()],
    queryFn: async () => {
      if (!wallet.publicKey) return 0;
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
      const ata = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: USDC_DEVNET_MINT });
      const amount = ata.value[0]?.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
      return amount;
    },
    enabled: Boolean(wallet.publicKey),
    refetchInterval: 30_000,
  });
}