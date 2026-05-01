"use client";
import type { ReactNode } from "react";

import { Header } from "@/components/organisms/Header";
import { KPICard } from "@/components/molecules/KPICard";
import { VaultCard } from "@/components/molecules/VaultCard";
import { TransactionRow } from "@/components/molecules/TransactionRow";
import {
  KPICardSkeleton,
  VaultCardSkeleton,
  TableRowSkeleton,
} from "@/components/atoms/Skeleton";
import { useQuery } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { formatUsdc, formatUsdcRaw } from "@/lib/format";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Link from "next/link";
import type { Vault } from "@/types/domain";

/* ---------- API response types ---------- */

type OverviewData = {
  totalVaults: number;
  totalVolumeUsdc: number;
  totalUsers: number;
  totalReleases: number;
  successRate: number;
};

type DailyRow = {
  date: string;
  total_vaults_created: number;
  total_volume_usdc: number;
  total_releases: number;
};

type Transaction = {
  id: string;
  tx_signature: string;
  tx_type: string;
  amount_usdc: number | null;
  from_wallet: string | null;
  to_wallet: string | null;
  condition_type: string | null;
  created_at: string;
};

/* ---------- constants ---------- */

const PIE_COLORS = ["#7c5cfc", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6"];

/* ---------- component ---------- */

export default function DashboardHome(): ReactNode {
  /* --- overview KPIs --- */
  const overview = useQuery<OverviewData>({
    queryKey: ["analytics", "overview"],
    queryFn: async () => {
      const { data } = await api.get<ApiResult<OverviewData>>(
        "/analytics/overview",
      );
      return data.data;
    },
  });

  /* --- 30-day daily chart data --- */
  const daily = useQuery<DailyRow[]>({
    queryKey: ["analytics", "daily", 30],
    queryFn: async () => {
      const { data } = await api.get<ApiResult<DailyRow[]>>(
        "/analytics/daily",
        { params: { days: 30 } },
      );
      return data.data;
    },
  });

  /* --- recent transactions --- */
  const transactions = useQuery<Transaction[]>({
    queryKey: ["transactions", "recent"],
    queryFn: async () => {
      const { data } = await api.get<ApiResult<Transaction[]>>(
        "/transactions",
        { params: { limit: 10 } },
      );
      return data.data;
    },
  });

  /* --- active vaults (take 3 most recent) --- */
  const vaults = useQuery<Vault[]>({
    queryKey: ["vaults", "active-recent"],
    queryFn: async () => {
      const { data } = await api.get<ApiResult<Vault[]>>("/vaults", {
        params: { status: "active", limit: 3, sort: "created_at:desc" },
      });
      return data.data;
    },
  });

  /* --- derive condition-type breakdown from transactions for donut chart --- */
  const conditionBreakdown = (() => {
    if (!transactions.data) return [];
    const counts: Record<string, number> = {};
    transactions.data.forEach((tx) => {
      const key = tx.condition_type ?? "none";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  /* --- chart data formatted for Recharts --- */
  const chartData = (daily.data ?? []).map((d) => ({
    date: d.date.slice(5), // MM-DD
    volume: d.total_volume_usdc / 1_000_000,
  }));

  return (
    <div className="min-h-full">
      <Header title="Dashboard" />

      {/* ===== KPI cards ===== */}
      <section className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
        {overview.isLoading ? (
          <>
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </>
        ) : overview.data ? (
          <>
            <KPICard
              title="Total Volume"
              value={formatUsdc(overview.data.totalVolumeUsdc)}
              delta={`${overview.data.totalVaults} vaults`}
            />
            <KPICard
              title="Active Vaults"
              value={String(overview.data.totalVaults)}
              delta={`${overview.data.totalUsers} users`}
            />
            <KPICard
              title="Total Releases"
              value={String(overview.data.totalReleases)}
              delta={`${overview.data.successRate.toFixed(1)}% success`}
            />
            <KPICard
              title="Success Rate"
              value={`${overview.data.successRate.toFixed(1)}%`}
              delta={`${overview.data.totalReleases} releases`}
            />
          </>
        ) : (
          <div className="col-span-full text-sm text-[var(--text-muted)]">
            Unable to load overview data.
          </div>
        )}
      </section>

      {/* ===== Charts row ===== */}
      <section className="grid gap-4 px-6 lg:grid-cols-3">
        {/* Line chart: 30-day volume */}
        <div className="card col-span-2 p-5">
          <h2 className="mb-4 text-sm font-semibold">
            Volume &mdash; Last 30 Days
          </h2>
          {daily.isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
              Loading chart...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [
                    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    "Volume",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#7c5cfc"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut chart: condition type breakdown */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Condition Types</h2>
          {transactions.isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
              Loading chart...
            </div>
          ) : conditionBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={conditionBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name }: { name: string }) => name}
                >
                  {conditionBreakdown.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
              No data available.
            </div>
          )}
        </div>
      </section>

      {/* ===== Recent activity + Active vaults ===== */}
      <section className="grid gap-4 p-6 lg:grid-cols-3">
        {/* Recent transactions */}
        <div className="card col-span-2 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-semibold">Recent Transactions</h2>
            <Link
              href="/dashboard/analytics"
              className="text-xs text-[var(--primary)] transition hover:underline"
            >
              View all
            </Link>
          </div>
          {transactions.isLoading ? (
            <>
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
            </>
          ) : transactions.data && transactions.data.length > 0 ? (
            transactions.data.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No recent transactions.
            </div>
          )}
        </div>

        {/* Active vaults */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Active Vaults</h2>
            <Link
              href="/dashboard/vaults"
              className="text-xs text-[var(--primary)] transition hover:underline"
            >
              View all
            </Link>
          </div>
          {vaults.isLoading ? (
            <>
              <VaultCardSkeleton />
              <VaultCardSkeleton />
              <VaultCardSkeleton />
            </>
          ) : vaults.data && vaults.data.length > 0 ? (
            vaults.data.map((vault) => (
              <Link key={vault.id} href={`/dashboard/vaults/${vault.id}`}>
                <VaultCard vault={vault} />
              </Link>
            ))
          ) : (
            <div className="card flex h-40 items-center justify-center text-sm text-[var(--text-muted)]">
              No active vaults.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
