"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/organisms/Header";
import { VaultCard } from "@/components/molecules/VaultCard";
import { VaultCardSkeleton } from "@/components/atoms/Skeleton";
import { Button } from "@/components/atoms/Button";
import { useVaults } from "@/hooks/useVaults";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Plus, Inbox } from "lucide-react";
import type { VaultStatus } from "@/types/domain";

const STATUS_TABS: Array<{ label: string; value: VaultStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Released", value: "released" },
  { label: "Disputed", value: "disputed" },
  { label: "Cancelled", value: "cancelled" },
];

const SORT_OPTIONS = [
  { label: "Newest", value: "desc" },
  { label: "Oldest", value: "asc" },
  { label: "Amount High", value: "amount-desc" },
  { label: "Amount Low", value: "amount-asc" },
];

export default function VaultListPage(): ReactNode {
  const { publicKey } = useWallet();
  const [statusFilter, setStatusFilter] = useState<VaultStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "sent" | "receiving">("all");
  const [sort, setSort] = useState("desc");
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const sortBy = sort.startsWith("amount") ? "amount" : "created_at";
  const sortOrder = sort.endsWith("asc") ? "asc" : "desc";

  const walletAddress = publicKey?.toBase58();
  const filters: Record<string, string | undefined> = {
    limit: "20",
    sortBy,
    sortOrder,
    cursor,
    status: statusFilter === "all" ? undefined : statusFilter,
    creator: roleFilter === "sent" && walletAddress ? walletAddress : undefined,
    recipient: roleFilter === "receiving" && walletAddress ? walletAddress : undefined,
  };

  const vaultsQuery = useVaults(filters);
  const vaults = vaultsQuery.data?.data ?? [];
  const meta = vaultsQuery.data?.meta;

  return (
    <div className="min-h-full">
      <Header title="Vaults" />
      <div className="p-6">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setCursor(undefined); }}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === tab.value
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {walletAddress ? (
            <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
              {(["all", "sent", "receiving"] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => { setRoleFilter(role); setCursor(undefined); }}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition ${
                    roleFilter === role
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          ) : null}

          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setCursor(undefined); }}
            className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--text)] outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <Link href="/dashboard/create" className="ml-auto">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Create Payment
            </Button>
          </Link>
        </div>

        {/* Grid */}
        {vaultsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" style={{ contentVisibility: "auto" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <VaultCardSkeleton key={i} />
            ))}
          </div>
        ) : vaults.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid place-items-center gap-4 py-20 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-2)]">
              <Inbox className="h-8 w-8 text-[var(--text-faint)]" />
            </div>
            <p className="text-[var(--text-muted)]">No vaults found</p>
            <p className="max-w-xs text-xs text-[var(--text-faint)]">
              {statusFilter !== "all"
                ? `No ${statusFilter} vaults. Try a different filter.`
                : "Create your first programmable payment to get started."}
            </p>
            <Link href="/dashboard/create">
              <Button size="sm">
                <Plus className="h-4 w-4" /> Create Payment
              </Button>
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" style={{ contentVisibility: "auto" }}>
              {vaults.map((vault, i) => (
                <motion.div key={vault.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link href={`/dashboard/vaults/${vault.id}`}>
                    <VaultCard vault={vault} />
                  </Link>
                </motion.div>
              ))}
            </div>
            {meta?.hasMore ? (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setCursor(meta.cursor)}
                  loading={vaultsQuery.isFetching}
                >
                  Load More
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
