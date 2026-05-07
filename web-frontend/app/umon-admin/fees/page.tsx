"use client";

import { type ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi as api, type ApiResult } from "@/lib/adminApi";
import { truncateAddress } from "@/lib/format";
import { explorerTxUrl } from "@/lib/constants";
import { DollarSign, ExternalLink, Search } from "lucide-react";

type FeeRow = {
  id: string;
  vault_id: string;
  payer_wallet: string;
  amount_usdc: number;
  fee_percentage: number;
  vault_amount_usdc: number;
  tx_signature: string;
  created_at: string;
};

function formatUsdc(lamports: number): string {
  return `$${(lamports / 1_000_000).toFixed(lamports >= 1_000_000 ? 2 : 4)}`;
}

export default function AdminFeesPage(): ReactNode {
  const [wallet, setWallet] = useState("");

  const feesQuery = useQuery({
    queryKey: ["admin-fees", wallet],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "200" };
      if (wallet) params.wallet = wallet;
      const res = await api.get<ApiResult<FeeRow[]>>("/admin/fees", { params });
      return res.data;
    },
  });

  const fees = feesQuery.data?.data ?? [];
  const total = feesQuery.data?.meta?.total ?? 0;
  const totalCollected = fees.reduce((sum, f) => sum + Number(f.amount_usdc), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fee Tracking</h1>
        <p className="text-sm text-gray-500">All platform fees collected from vault creation</p>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Fees (shown)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatUsdc(totalCollected)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Transactions</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Avg Fee</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{fees.length > 0 ? formatUsdc(totalCollected / fees.length) : "$0"}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative inline-block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="Filter by payer wallet..."
            className="h-9 w-80 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500">Date</th>
              <th className="px-4 py-3 font-medium text-gray-500">Payer</th>
              <th className="px-4 py-3 font-medium text-gray-500">Vault Amount</th>
              <th className="px-4 py-3 font-medium text-gray-500">Fee %</th>
              <th className="px-4 py-3 font-medium text-gray-500">Fee Amount</th>
              <th className="px-4 py-3 font-medium text-gray-500">Transaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {feesQuery.isLoading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : fees.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No fees collected yet</td></tr>
            ) : fees.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(f.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{truncateAddress(f.payer_wallet)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{formatUsdc(f.vault_amount_usdc)}</td>
                <td className="px-4 py-3 text-gray-500">{f.fee_percentage}%</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 font-medium text-green-700">
                    <DollarSign className="h-3 w-3" />
                    {formatUsdc(f.amount_usdc)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={explorerTxUrl(f.tx_signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                  >
                    {f.tx_signature.slice(0, 8)}...
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
