"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import type { Vault } from "@/types/domain";

export function useVault(id: string): UseQueryResult<ApiResult<Vault>> {
  return useQuery<ApiResult<Vault>>({
    queryKey: ["vault", id],
    queryFn: async () => {
      const response = await api.get<ApiResult<Vault>>(`/vaults/${id}`);
      return response.data;
    },
    enabled: id.length > 0,
    refetchInterval: 10_000,
  });
}
