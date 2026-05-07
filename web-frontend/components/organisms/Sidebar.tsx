"use client";
import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Plus,
  Vault,
  Store,
  BarChart3,
  Receipt,
  Settings,
  QrCode,
} from "lucide-react";

const items = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/create", label: "Create Payment", icon: Plus },
  { href: "/dashboard/receive", label: "Receive", icon: QrCode },
  { href: "/dashboard/vaults", label: "Vaults", icon: Vault },
  { href: "/dashboard/merchants", label: "Merchants", icon: Store },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/fees", label: "Fees & Receipts", icon: Receipt },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const mobileItems = items.slice(0, 5);

export function Sidebar(): ReactNode {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-[240px] flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-bold text-white">
            P
          </div>
          PowerMoney
        </div>
        <nav className="grid gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-[var(--primary-subtle)] font-medium text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm md:hidden">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition",
                active
                  ? "text-[var(--primary)]"
                  : "text-[var(--text-muted)]",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label.split(" ").pop()}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
