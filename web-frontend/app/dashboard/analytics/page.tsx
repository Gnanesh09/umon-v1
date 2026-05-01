"use client";

import { ReactNode, useState, useMemo } from "react";
import { Header } from "@/components/organisms/Header";
import { KPICard } from "@/components/molecules/KPICard";
import {
  KPICardSkeleton,
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
  BarChart,
  Bar,
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
const DATE_RANGES = [7, 30, 90] as const;
type DateRange = (typeof DATE_RANGES)[number];

/* ---------- component ---------- */

export default function AnalyticsPage(): ReactNode {
  const [days, setDays] = useState<DateRange>(30);
  const [sortField, setSortField] = useState<"amount" | "released" | "date">(
    "amount",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  /* --- overview KPIs --- */
  const overview = useQuery<OverviewData>({
    queryKey: ["analytics", "overview", days],
    queryFn: async () => {
      const { data } = await api.get<ApiResult<OverviewData>>(
        "/analytics/overview",
        { params: { days } },
      );
      return data.data;
    },
  });

  /* --- daily chart data --- */
  const daily = useQuery<DailyRow[]>({
    queryKey: ["analytics", "daily", days],
    queryFn: async () => {
      const { data } = await api.get<ApiResult<DailyRow[]>>(
        "/analytics/daily",
        { params: { days } },
      );
      return data.data;
    },
  });

  /* --- transactions (for condition-type breakdown) --- */
  const transactions = useQuery<Transaction[]>({
    queryKey: ["transactions", "all", days],
    queryFn: async () => {
      const { data } = await api.get<ApiResult<Transaction[]>>(
        "/transactions",
        { params: { limit: 200, days } },
      );
      return data.data;
    },
  });

  /* --- vaults (for top-vaults table & status distribution) --- */
  const vaults = useQuery<Vault[]>({
    queryKey: ["vaults", "all", days],
    queryFn: async () => {
      const { data } = await api.get<ApiResult<Vault[]>>("/vaults", {
        params: { limit: 50, sort: "amount_usdc:desc", days },
      });
      return data.data;
    },
  });

  /* ---------- derived data ---------- */

  /* condition type usage for bar chart */
  const conditionUsage = useMemo(() => {
    if (!transactions.data) return [];
    const counts: Record<string, number> = {};
    transactions.data.forEach((tx) => {
      const key = tx.condition_type ?? "none";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [transactions.data]);

  /* vault status distribution for donut */
  const statusDistribution = useMemo(() => {
    if (!vaults.data) return [];
    const counts: Record<string, number> = {};
    vaults.data.forEach((v) => {
      counts[v.status] = (counts[v.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [vaults.data]);

  /* chart-ready daily volume */
  const volumeChart = useMemo(
    () =>
      (daily.data ?? []).map((d) => ({
        date: d.date.slice(5),
        volume: d.total_volume_usdc / 1_000_000,
      })),
    [daily.data],
  );

  /* derived KPI values */
  const avgReleaseTime = useMemo(() => {
    if (!vaults.data || vaults.data.length === 0) return "N/A";
    const released = vaults.data.filter(
      (v) => v.status === "released" || v.status === "partially_released",
    );
    if (released.length === 0) return "N/A";
    const totalMs = released.reduce((sum, v) => {
      const created = new Date(v.created_at).getTime();
      return sum + (Date.now() - created);
    }, 0);
    const avgDays = totalMs / released.length / 86_400_000;
    return avgDays < 1
      ? `${(avgDays * 24).toFixed(1)}h`
      : `${avgDays.toFixed(1)}d`;
  }, [vaults.data]);

  const activeWallets = useMemo(() => {
    if (!vaults.data) return 0;
    const wallets = new Set<string>();
    vaults.data.forEach((v) => {
      wallets.add(v.creator_wallet);
      wallets.add(v.recipient_wallet);
    });
    return wallets.size;
  }, [vaults.data]);

  /* sorted top vaults */
  const sortedVaults = useMemo(() => {
    if (!vaults.data) return [];
    const copy = [...vaults.data];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === "amount") cmp = a.amount_usdc - b.amount_usdc;
      else if (sortField === "released")
        cmp = a.released_amount_usdc - b.released_amount_usdc;
      else
        cmp =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "desc" ? -cmp : cmp;
    });
    return copy.slice(0, 10);
  }, [vaults.data, sortField, sortDir]);

  function toggleSort(field: "amount" | "released" | "date") {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sortIndicator = (field: string) =>
    sortField === field ? (sortDir === "desc" ? " ▼" : " ▲") : "";

  return (
    <div className="min-h-full">
      <Header title="Analytics" />

      {/* ===== Date range tabs ===== */}
      <div className="flex items-center gap-2 px-6 pt-6">
        {DATE_RANGES.map((range) => (
          <button
            key={range}
            onClick={() => setDays(range)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              days === range
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
            }`}
          >
            Last {range}d
          </button>
        ))}
      </div>

      {/* ===== KPI cards (6 total) ===== */}
      <section className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {overview.isLoading ? (
          <>
            <KPICardSkeleton />
            <KPICardSkeleton />
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
              delta={`${days}d period`}
            />
            <KPICard
              title="Vaults Created"
              value={String(overview.data.totalVaults)}
              delta={`${days}d period`}
            />
            <KPICard
              title="Released"
              value={String(overview.data.totalReleases)}
              delta={`${overview.data.successRate.toFixed(1)}% success`}
            />
            <KPICard
              title="Success Rate"
              value={`${overview.data.successRate.toFixed(1)}%`}
              delta={`${overview.data.totalReleases} releases`}
            />
            <KPICard
              title="Avg Release Time"
              value={avgReleaseTime}
              delta="avg across vaults"
            />
            <KPICard
              title="Active Wallets"
              value={String(activeWallets)}
              delta={`${overview.data.totalUsers} total users`}
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
        {/* Line chart: daily volume */}
        <div className="card col-span-2 p-5">
          <h2 className="mb-4 text-sm font-semibold">
            Daily Volume &mdash; Last {days} Days
          </h2>
          {daily.isLoading ? (
            <div className="flex h-72 items-center justify-center text-sm text-[var(--text-muted)]">
              Loading chart...
            </div>
          ) : volumeChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={volumeChart}>
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
          ) : (
            <div className="flex h-72 items-center justify-center text-sm text-[var(--text-muted)]">
              No data for selected period.
            </div>
          )}
        </div>

        {/* Donut chart: vault status distribution */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Vault Status</h2>
          {vaults.isLoading ? (
            <div className="flex h-72 items-center justify-center text-sm text-[var(--text-muted)]">
              Loading chart...
            </div>
          ) : statusDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name }: { name: string }) => name}
                >
                  {statusDistribution.map((_, i) => (
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
            <div className="flex h-72 items-center justify-center text-sm text-[var(--text-muted)]">
              No data available.
            </div>
          )}
        </div>
      </section>

      {/* ===== Bar chart: condition type usage ===== */}
      <section className="px-6 pt-4">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">
            Condition Type Usage
          </h2>
          {transactions.isLoading ? (
            <div className="flex h-72 items-center justify-center text-sm text-[var(--text-muted)]">
              Loading chart...
            </div>
          ) : conditionUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={conditionUsage}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#7c5cfc"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-72 items-center justify-center text-sm text-[var(--text-muted)]">
              No data available.
            </div>
          )}
        </div>
      </section>

      {/* ===== Top vaults table ===== */}
      <section className="p-6">
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-semibold">Top Vaults by Value</h2>
          </div>

          {/* table header */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-xs font-medium text-[var(--text-muted)]">
            <span>Description</span>
            <button
              onClick={() => toggleSort("amount")}
              className="text-left transition hover:text-[var(--text)]"
            >
              Amount{sortIndicator("amount")}
            </button>
            <button
              onClick={() => toggleSort("released")}
              className="text-left transition hover:text-[var(--text)]"
            >
              Released{sortIndicator("released")}
            </button>
            <span>Status</span>
            <button
              onClick={() => toggleSort("date")}
              className="text-left transition hover:text-[var(--text)]"
            >
              Created{sortIndicator("date")}
            </button>
          </div>

          {/* table body */}
          {vaults.isLoading ? (
            <>
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
            </>
          ) : sortedVaults.length > 0 ? (
            sortedVaults.map((v) => (
              <Link
                key={v.id}
                href={`/dashboard/vaults/${v.id}`}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-2 border-b border-[var(--border)] px-4 py-3 text-sm transition last:border-b-0 hover:bg-[var(--surface-2)]"
              >
                <span className="truncate font-medium">
                  {v.description || "Untitled"}
                </span>
                <span className="tabular-nums">
                  {formatUsdcRaw(v.amount_usdc)} USDC
                </span>
                <span className="tabular-nums text-[var(--text-muted)]">
                  {formatUsdcRaw(v.released_amount_usdc)} USDC
                </span>
                <span className="capitalize">{v.status.replace(/_/g, " ")}</span>
                <span className="text-[var(--text-muted)]">
                  {new Date(v.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No vaults found for this period.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
