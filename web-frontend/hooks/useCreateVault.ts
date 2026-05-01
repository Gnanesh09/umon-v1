"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type CreateVaultInput = {
  onChainId: string;
  creatorWallet: string;
  recipientWallet: string;
  amountUsdc: number;
  releasedAmountUsdc: number;
  status: "active" | "partially_released" | "released" | "disputed" | "cancelled";
  description: string;
  conditions: Array<Record<string, unknown>>;
  txSignature?: string;
};

export function useCreateVault(): UseMutationResult<unknown, Error, CreateVaultInput> {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, CreateVaultInput>({
    mutationFn: async (payload: CreateVaultInput) => {
      const response = await api.post("/vaults", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
    },
  });
}
