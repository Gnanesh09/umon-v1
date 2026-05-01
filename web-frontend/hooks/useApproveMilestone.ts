"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useApproveMilestone(vaultId: string, token: string | null): UseMutationResult<unknown, Error, string> {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, string>({
    mutationFn: async (txSignature: string) => {
      const response = await api.post(
        `/vaults/${vaultId}/approve-milestone`,
        { txSignature },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      return response.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["vault", vaultId] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", vaultId] });
    },
  });
}
