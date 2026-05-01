"use client";

import { useQuery } from "@tanstack/react-query";

export function useOracleValue(feedAddress: string): ReturnType<typeof useQuery> {
  return useQuery({
    queryKey: ["oracle", feedAddress],
    queryFn: async () => {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      const data = (await response.json()) as { solana?: { usd?: number } };
      return data.solana?.usd ?? 0;
    },
    refetchInterval: 30_000,
  });
}