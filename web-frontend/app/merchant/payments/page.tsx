"use client";

import { type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { truncateAddress, formatUsdcRaw, timeAgo } from "@/lib/format";
import { explorerTxUrl } from "@/lib/constants";
import { toast } from "sonner";
import {
  CreditCard,
  ExternalLink,
  ArrowDownLeft,
  Wallet,
  Tag,
  CheckCircle2,
  Loader2,
  Inbox,
} from "lucide-react";

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

type ClaimableVault = {
  id: string;
  on_chain_id: string;
  creator_wallet: string;
  recipient_wallet: string;
  amount_usdc: number;
  released_amount_usdc: number;
  status: string;
  description: string | null;
  conditions: Array<{
    type: string;
    categories?: string[];
    percentage?: number;
    [key: string]: unknown;
  }>;
  created_at: string;
  _matchingBusiness: {
    id: string;
    merchantId: string;
    businessName: string;
    category: string;
  } | null;
  _allowedCategories: string[];
};

function formatUsdc(lamports: number): string {
  return `$${(lamports / 1_000_000).toFixed(2)}`;
}

const TX_TYPE_LABEL: Record<string, string> = {
  release: "Payment Received",
  split: "Split Payment",
  fund: "Vault Funded",
  deposit: "Deposit",
  category_claim: "Category Claim",
};

export default function MerchantPaymentsPage(): ReactNode {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const claimableQuery = useQuery({
    queryKey: ["claimable-vaults"],
    queryFn: async () => {
      const res = await api.get<ApiResult<ClaimableVault[]>>("/vaults/claimable");
      return res.data.data;
    },
    enabled: !!user,
  });

  const txQuery = useQuery({
    queryKey: ["merchant-payments"],
    queryFn: async () => {
      const res = await api.get<ApiResult<Transaction[]>>("/transactions", {
        params: { limit: 100 },
      });
      return res.data.data;
    },
    enabled: !!user,
  });

  const claimMut = useMutation({
    mutationFn: async (vaultId: string) => {
      const res = await api.post(`/vaults/${vaultId}/claim`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Funds claimed successfully!");
      queryClient.invalidateQueries({ queryKey: ["claimable-vaults"] });
      queryClient.invalidateQueries({ queryKey: ["merchant-payments"] });
    },
    onError: (err: Error & { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err.response?.data?.error?.message ?? "Failed to claim funds");
    },
  });

  const claimable = claimableQuery.data ?? [];
  const transactions = txQuery.data ?? [];
  const totalReceived = transactions
    .filter((tx) => tx.amount_usdc && (tx.tx_type === "release" || tx.tx_type === "split" || tx.tx_type === "category_claim"))
    .reduce((sum, tx) => sum + Number(tx.amount_usdc ?? 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-cabinet text-2xl font-bold text-[var(--text)]">Payments</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Track incoming payments and claim category-restricted funds.</p>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--text-muted)]">Total Received</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">{formatUsdc(totalReceived)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--text-muted)]">Transactions</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">{transactions.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-sm text-emerald-400">Claimable Vaults</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{claimable.length}</p>
        </div>
      </div>

      {/* Claimable Vaults */}
      {(claimableQuery.isLoading || claimable.length > 0) && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Inbox size={18} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-[var(--text)]">Incoming Category Payments</h2>
          </div>

          {claimableQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-3)]" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {claimable.map((vault) => {
                const catCondition = vault.conditions.find((c) => c.type === "category");
                const percentage = catCondition?.percentage ?? 100;
                const claimAmount = Math.floor((vault.amount_usdc * percentage) / 100);

                return (
                  <div
                    key={vault.id}
                    className="rounded-xl border border-emerald-500/20 bg-[var(--surface)] p-5 transition hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                            <Wallet size={18} className="text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text)]">
                              {formatUsdc(claimAmount)} available to claim
                            </p>
                            <p className="text-xs text-[var(--text-faint)]">
                              From {truncateAddress(vault.creator_wallet)} &middot; {timeAgo(vault.created_at)}
                            </p>
                          </div>
                        </div>

                        {vault.description && (
                          <p className="mt-2 text-sm text-[var(--text-muted)]">{vault.description}</p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Tag size={12} className="text-[var(--text-faint)]" />
                            <span className="text-xs text-[var(--text-muted)]">Categories:</span>
                          </div>
                          {vault._allowedCategories.map((cat) => (
                            <span
                              key={cat}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                cat === vault._matchingBusiness?.category
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-[var(--surface-3)] text-[var(--text-muted)]"
                              }`}
                            >
                              {cat}
                            </span>
                          ))}
                          {vault._matchingBusiness && (
                            <span className="ml-1 text-xs text-[var(--text-faint)]">
                              &middot; matched to <span className="font-medium text-[var(--text-muted)]">{vault._matchingBusiness.businessName}</span>
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-faint)]">
                          <span>Vault: {formatUsdc(vault.amount_usdc)} total</span>
                          <span>{percentage}% for category</span>
                          <span className="font-mono">{vault.id.slice(0, 8)}...</span>
                        </div>
                      </div>

                      <button
                        onClick={() => claimMut.mutate(vault.id)}
                        disabled={claimMut.isPending}
                        className="ml-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {claimMut.isPending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Claim Funds
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Transaction List */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">Recent Transactions</h2>
        </div>

        {txQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--text-faint)]">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard size={40} className="mx-auto mb-3 text-[var(--text-faint)]" />
            <p className="text-[var(--text-muted)]">No transactions yet</p>
            <p className="mt-1 text-xs text-[var(--text-faint)]">Payments will appear here once you start receiving them.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3 transition hover:bg-[var(--surface-2)]">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    tx.tx_type === "category_claim" ? "bg-emerald-500/10" : "bg-emerald-500/10"
                  }`}>
                    <ArrowDownLeft size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">
                      {TX_TYPE_LABEL[tx.tx_type] ?? tx.tx_type}
                    </p>
                    <p className="text-xs text-[var(--text-faint)]">
                      {tx.from_wallet ? truncateAddress(tx.from_wallet) : "—"} &rarr;{" "}
                      {tx.to_wallet ? truncateAddress(tx.to_wallet) : "—"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {tx.amount_usdc ? (
                    <p className="text-sm font-medium text-emerald-400">{formatUsdc(tx.amount_usdc)}</p>
                  ) : (
                    <p className="text-sm text-[var(--text-faint)]">—</p>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-[var(--text-faint)]">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </span>
                    {tx.tx_signature && !tx.tx_signature.startsWith("claim-") && (
                      <a
                        href={explorerTxUrl(tx.tx_signature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--text-faint)] transition hover:text-indigo-400"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
