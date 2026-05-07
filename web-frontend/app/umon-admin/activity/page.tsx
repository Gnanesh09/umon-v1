"use client";

import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi as api, type ApiResult } from "@/lib/adminApi";
import { truncateAddress } from "@/lib/format";
import { explorerTxUrl } from "@/lib/constants";
import { ExternalLink, ArrowRight, Clock } from "lucide-react";

type Transaction = {
  id: string;
  vault_id: string;
  tx_signature: string;
  tx_type: string;
  amount_usdc: number | null;
  from_wallet: string | null;
  to_wallet: string | null;
  condition_type: string | null;
  created_at: string;
};

const TX_TYPE_STYLES: Record<string, string> = {
  create: "bg-blue-100 text-blue-700",
  release: "bg-emerald-100 text-emerald-700",
  milestone_approve: "bg-purple-100 text-purple-700",
  split: "bg-amber-100 text-amber-700",
  cancel: "bg-red-100 text-red-700",
  dispute: "bg-orange-100 text-orange-700",
};

function formatUsdc(lamports: number): string {
  return `$${(lamports / 1_000_000).toFixed(2)}`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminActivityPage(): ReactNode {
  const activityQuery = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const res = await api.get<ApiResult<Transaction[]>>("/admin/activity");
      return res.data.data;
    },
    refetchInterval: 15_000,
  });

  const transactions = activityQuery.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recent Activity</h1>
        <p className="text-sm text-gray-500">Live feed of all platform transactions</p>
      </div>

      <div className="space-y-2">
        {activityQuery.isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
          ))
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center text-gray-400">
            No activity yet
          </div>
        ) : transactions.map((tx) => (
          <div key={tx.id} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:shadow-sm">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TX_TYPE_STYLES[tx.tx_type] ?? "bg-gray-100 text-gray-600"}`}>
              {tx.tx_type.replace("_", " ")}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                {tx.from_wallet ? (
                  <span className="font-mono text-xs text-gray-500">{truncateAddress(tx.from_wallet)}</span>
                ) : null}
                {tx.from_wallet && tx.to_wallet ? <ArrowRight className="h-3 w-3 text-gray-300" /> : null}
                {tx.to_wallet ? (
                  <span className="font-mono text-xs text-gray-500">{truncateAddress(tx.to_wallet)}</span>
                ) : null}
              </div>
              {tx.condition_type ? (
                <span className="text-xs text-gray-400">{tx.condition_type.replace("_", " ")}</span>
              ) : null}
            </div>
            {tx.amount_usdc ? (
              <span className="font-medium text-gray-900">{formatUsdc(tx.amount_usdc)}</span>
            ) : null}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {timeAgo(tx.created_at)}
            </div>
            <a
              href={explorerTxUrl(tx.tx_signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
