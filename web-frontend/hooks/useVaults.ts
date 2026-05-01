"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import type { Vault } from "@/types/domain";

export function useVaults(filters: Record<string, string | undefined>): UseQueryResult<ApiResult<Vault[]>> {
  return useQuery<ApiResult<Vault[]>>({
    queryKey: ["vaults", filters],
    queryFn: async () => {
      const response = await api.get<ApiResult<Vault[]>>("/vaults", { params: filters });
      return response.data;
    },
    staleTime: 30_000,
  });
}
