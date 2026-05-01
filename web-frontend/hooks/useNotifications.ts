"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";

export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

export function useNotifications(token: string | null): {
  notificationsQuery: UseQueryResult<ApiResult<NotificationRecord[]>>;
  markRead: UseMutationResult<void, Error, string>;
} {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery<ApiResult<NotificationRecord[]>>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get<ApiResult<NotificationRecord[]>>("/notifications", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    },
    enabled: Boolean(token),
    refetchInterval: 30_000,
  });

  const markRead = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.put(`/notifications/${id}/read`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return { notificationsQuery, markRead };
}
