"use client";

import { ReactNode, useState, useEffect } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Bell, Command } from "lucide-react";
import { NotificationPanel } from "../molecules/NotificationPanel";
import { useUiStore } from "@/store/uiStore";
import { useNotifications } from "@/hooks/useNotifications";

function useJwt(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setToken(localStorage.getItem("pm_jwt"));
  }, []);
  return token;
}

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function Header({ title }: { title: string }): ReactNode {
  const [notifOpen, setNotifOpen] = useState(false);
  const { setCommandOpen } = useUiStore();
  const token = useJwt();
  const mounted = useMounted();
  const { notificationsQuery } = useNotifications(token);
  const unreadCount = ((notificationsQuery.data?.data ?? []) as Array<{ read: boolean }>).filter((n) => !n.read).length;

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/80 px-4 backdrop-blur md:px-6">
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--primary)] md:flex"
          >
            <Command className="h-3 w-3" />K
          </button>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] transition hover:text-[var(--text)]"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>
          {mounted ? <WalletMultiButton /> : <div className="h-10 w-40 animate-pulse rounded-md bg-[var(--surface-2)]" />}
        </div>
      </header>
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} token={token} />
    </>
  );
}
