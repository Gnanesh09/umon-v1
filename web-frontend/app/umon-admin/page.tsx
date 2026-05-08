"use client";

import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi as api, type ApiResult } from "@/lib/adminApi";
import { Users, Store, DollarSign, Vault, Clock, TrendingUp } from "lucide-react";

type AdminStats = {
  totalUsers: number;
  totalMerchants: number;
  pendingMerchants: number;
  totalVaults: number;
  activeVaults: number;
  totalFeesCollected: number;
};

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}): ReactNode {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--text)]">{value}</p>
      {sub ? <p className="mt-1 text-xs text-[var(--text-faint)]">{sub}</p> : null}
    </div>
  );
}

export default function AdminOverviewPage(): ReactNode {
  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await api.get<ApiResult<AdminStats>>("/admin/stats");
      return res.data.data;
    },
    refetchInterval: 30_000,
  });

  const stats = statsQuery.data;

  const formatUsdc = (lamports: number) => {
    return `$${(lamports / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)]">Platform overview and key metrics</p>
      </div>

      {statsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-3)]" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Total Users"
            value={stats.totalUsers}
            icon={Users}
            color="bg-blue-500/10 text-blue-400"
          />
          <StatCard
            label="Approved Merchants"
            value={stats.totalMerchants}
            sub={stats.pendingMerchants > 0 ? `${stats.pendingMerchants} pending review` : undefined}
            icon={Store}
            color="bg-emerald-500/10 text-emerald-400"
          />
          <StatCard
            label="Pending Approvals"
            value={stats.pendingMerchants}
            icon={Clock}
            color="bg-amber-500/10 text-amber-400"
          />
          <StatCard
            label="Total Vaults"
            value={stats.totalVaults}
            sub={`${stats.activeVaults} active`}
            icon={Vault}
            color="bg-purple-50 text-purple-600"
          />
          <StatCard
            label="Fees Collected"
            value={formatUsdc(stats.totalFeesCollected)}
            icon={DollarSign}
            color="bg-green-50 text-green-600"
          />
          <StatCard
            label="Active Vaults"
            value={stats.activeVaults}
            icon={TrendingUp}
            color="bg-indigo-500/10 text-indigo-400"
          />
        </div>
      ) : null}
    </div>
  );
}
