"use client";

import { type ReactNode } from "react";
import { useAuthStore } from "@/stores/authStore";
import { CopyButton } from "@/components/atoms/CopyButton";
import { Wallet, User } from "lucide-react";

export default function MerchantSettingsPage(): ReactNode {
  const { user } = useAuthStore();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-cabinet text-2xl font-bold text-[var(--text)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Manage your merchant account settings.</p>
      </div>

      <div className="space-y-6">
        {/* Wallet Info */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            <Wallet size={16} /> Wallet
          </h2>
          <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-4 py-3">
            <code className="text-sm text-[var(--text)]">{user?.walletAddress ?? "Not connected"}</code>
            {user?.walletAddress && <CopyButton text={user.walletAddress} />}
          </div>
          <p className="mt-2 text-xs text-[var(--text-faint)]">
            This wallet is linked to all your merchant businesses. Payments will be received at business-specific wallet addresses.
          </p>
        </div>

        {/* Account Info */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            <User size={16} /> Account
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-[var(--text-faint)]">Display Name</p>
              <p className="mt-0.5 text-sm text-[var(--text)]">{user?.displayName ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--text-faint)]">Email</p>
              <p className="mt-0.5 text-sm text-[var(--text)]">{user?.email ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--text-faint)]">Role</p>
              <p className="mt-0.5 text-sm capitalize text-[var(--text)]">{user?.role ?? "user"}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--text-faint)]">
            Update your profile details from the{" "}
            <a href="/dashboard/settings" className="text-indigo-400 hover:underline">client dashboard settings</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
