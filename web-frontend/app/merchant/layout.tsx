"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  LayoutDashboard,
  Store,
  PlusCircle,
  CreditCard,
  Settings,
  ArrowLeft,
  Menu,
  X,
  Link2,
  FileText,
  Code2,
} from "lucide-react";

const navItems = [
  { href: "/merchant", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/merchant/businesses", label: "My Businesses", icon: Store, exact: false },
  { href: "/merchant/register", label: "Register Business", icon: PlusCircle, exact: false },
  { href: "/merchant/payments", label: "Payments", icon: CreditCard, exact: false },
  { href: "/merchant/payment-links", label: "Payment Links", icon: Link2, exact: false },
  { href: "/merchant/invoices", label: "Invoices", icon: FileText, exact: false },
  { href: "/merchant/developer", label: "Developer", icon: Code2, exact: false },
  { href: "/merchant/settings", label: "Settings", icon: Settings, exact: false },
];

export default function MerchantLayout({ children }: { children: ReactNode }): ReactNode {
  useAuth();
  const { user, loading } = useAuthStore();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--surface-3)] border-t-emerald-500" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[var(--bg)] px-6">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Store size={32} className="text-emerald-400" />
          </div>
          <h1 className="font-cabinet text-2xl font-bold text-[var(--text)]">Merchant Portal</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Connect your Solana wallet to access the merchant dashboard.
            Register businesses, manage payments, and grow your presence on PowerMoney.
          </p>
          <div className="mt-6">
            <WalletMultiButton />
          </div>
          <Link href="/" className="mt-6 inline-flex items-center gap-1 text-sm text-[var(--text-faint)] transition hover:text-[var(--text-muted)]">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--bg)]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-[var(--border)] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-bold text-white">
            M
          </div>
          <div>
            <span className="font-cabinet text-sm font-bold text-[var(--text)]">Merchant Portal</span>
            <p className="text-[10px] text-[var(--text-faint)]">PowerMoney</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-emerald-500/10 font-medium text-emerald-400"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-[var(--text-faint)] transition hover:text-[var(--text-muted)]"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </aside>

      {/* Mobile Header + Sidebar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="text-[var(--text-muted)]">
          <Menu size={20} />
        </button>
        <span className="font-cabinet text-sm font-bold text-[var(--text)]">Merchant Portal</span>
        <WalletMultiButton />
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-[var(--surface)] h-full shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
              <span className="font-cabinet text-sm font-bold text-[var(--text)]">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="text-[var(--text-faint)]">
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-1 p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                      active
                        ? "bg-emerald-500/10 font-medium text-emerald-400"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop Top Bar */}
        <header className="hidden h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 lg:flex">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-faint)]">
              {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
            </span>
            <WalletMultiButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
          <div className="mx-auto max-w-5xl p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
