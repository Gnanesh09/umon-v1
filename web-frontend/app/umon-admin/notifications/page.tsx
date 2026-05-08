"use client";

import { type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type ApiResult } from "@/lib/adminApi";
import { Bell, CheckCircle2, Wallet, Tag, Eye } from "lucide-react";
import { toast } from "sonner";

type AdminNotification = {
  id: string;
  wallet_address: string;
  type: string;
  title: string;
  message: string;
  vault_id: string | null;
  read: boolean;
  created_at: string;
};

const TYPE_STYLES: Record<string, string> = {
  category_vault_created: "border-l-blue-500 bg-blue-500/10",
  category_claim: "border-l-emerald-500 bg-emerald-500/10",
};

const TYPE_ICON: Record<string, ReactNode> = {
  category_vault_created: <Wallet size={16} className="text-blue-500" />,
  category_claim: <Tag size={16} className="text-emerald-500" />,
};

export default function AdminNotificationsPage(): ReactNode {
  const queryClient = useQueryClient();

  const notifQuery = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const res = await adminApi.get<ApiResult<AdminNotification[]>>("/admin/notifications");
      return res.data.data;
    },
  });

  const markReadMut = useMutation({
    mutationFn: async (id: string) => {
      await adminApi.put(`/admin/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: () => toast.error("Failed to mark as read"),
  });

  const notifications = notifQuery.data ?? [];
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Notifications</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {unread > 0 ? `${unread} unread notification${unread !== 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
          <Bell size={20} className="text-indigo-400" />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {notifQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--text-faint)]">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={40} className="mx-auto mb-3 text-[var(--text-faint)]" />
            <p className="text-[var(--text-muted)]">No notifications yet</p>
            <p className="mt-1 text-xs text-[var(--text-faint)]">
              Notifications will appear when category-restricted vaults are created or claimed.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-3 border-l-4 px-5 py-4 transition ${
                  notif.read
                    ? "border-l-gray-200 bg-[var(--surface)]"
                    : TYPE_STYLES[notif.type] ?? "border-l-indigo-500 bg-indigo-500/10"
                }`}
              >
                <div className="mt-0.5">
                  {TYPE_ICON[notif.type] ?? <Bell size={16} className="text-indigo-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${notif.read ? "text-[var(--text-muted)]" : "text-[var(--text)]"}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="h-2 w-2 rounded-full bg-indigo-500/100" />
                    )}
                  </div>
                  <p className={`mt-0.5 text-sm ${notif.read ? "text-[var(--text-faint)]" : "text-[var(--text-muted)]"}`}>
                    {notif.message}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-faint)]">
                    <span>{new Date(notif.created_at).toLocaleString()}</span>
                    {notif.vault_id && (
                      <span className="font-mono">{notif.vault_id.slice(0, 8)}...</span>
                    )}
                  </div>
                </div>
                {!notif.read && (
                  <button
                    onClick={() => markReadMut.mutate(notif.id)}
                    className="rounded-lg p-1.5 text-[var(--text-faint)] transition hover:bg-[var(--surface)] hover:text-[var(--text-muted)]"
                    title="Mark as read"
                  >
                    <Eye size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
