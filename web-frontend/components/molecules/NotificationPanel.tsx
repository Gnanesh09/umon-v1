"use client";
import type { ReactNode } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { X, Bell } from "lucide-react";
import { useNotifications, type NotificationRecord } from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/format";
import { Button } from "../atoms/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  token: string | null;
};

export function NotificationPanel({ open, onClose, token }: Props): ReactNode {
  const { notificationsQuery, markRead } = useNotifications(token);
  const notifications = (notificationsQuery.data?.data ?? []) as NotificationRecord[];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
          />
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-4 top-16 z-50 w-80 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </div>
              <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto overscroll-contain">
              {notifications.length === 0 ? (
                <p className="p-6 text-center text-xs text-[var(--text-muted)]">No notifications</p>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.read) markRead.mutate(n.id); }}
                    className={`block w-full border-b border-[var(--border)] px-4 py-3 text-left transition hover:bg-[var(--surface-2)] ${
                      n.read ? "opacity-60" : ""
                    }`}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{n.message}</p>
                    <p className="mt-1 text-[10px] text-[var(--text-faint)]">{timeAgo(n.created_at)}</p>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
