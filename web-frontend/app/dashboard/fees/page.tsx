"use client";

import { ReactNode, useState } from "react";
import { Header } from "@/components/organisms/Header";
import { KPICard } from "@/components/molecules/KPICard";
import { KPICardSkeleton, TableRowSkeleton } from "@/components/atoms/Skeleton";
import { Button } from "@/components/atoms/Button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { api, type ApiResult } from "@/lib/api";
import { formatUsdcRaw, truncateAddress, truncateTxSignature, timeAgo } from "@/lib/format";
import { explorerTxUrl } from "@/lib/constants";
import { toast } from "sonner";
import {
  Receipt,
  ExternalLink,
  Mail,
  Eye,
  Download,
  X,
} from "lucide-react";

type Fee = {
  id: string;
  vault_id: string | null;
  payer_wallet: string;
  amount_usdc: number;
  fee_percentage: number;
  vault_amount_usdc: number;
  tx_signature: string;
  created_at: string;
};

type FeeSummary = {
  totalFees: number;
  totalTransactions: number;
};

type ReceiptRow = {
  id: string;
  vault_id: string | null;
  wallet_address: string;
  tx_signature: string;
  receipt_type: string;
  amount_usdc: number;
  fee_usdc: number;
  recipient_wallet: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  emailed_at: string | null;
  created_at: string;
};

function receiptTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    vault_created: "Vault Created",
    funds_released: "Funds Released",
    milestone_approved: "Milestone Approved",
    split_executed: "Split Executed",
    vault_cancelled: "Vault Cancelled",
    dispute_raised: "Dispute Raised",
  };
  return labels[type] ?? type.replace(/_/g, " ");
}

function receiptTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    vault_created: "bg-blue-500/15 text-blue-400",
    funds_released: "bg-green-500/15 text-green-400",
    milestone_approved: "bg-emerald-500/15 text-emerald-400",
    split_executed: "bg-purple-500/15 text-purple-400",
    vault_cancelled: "bg-red-500/15 text-red-400",
    dispute_raised: "bg-amber-500/15 text-amber-400",
  };
  return colors[type] ?? "bg-[var(--surface-3)] text-[var(--text-muted)]";
}

export default function FeesPage(): ReactNode {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58();
  const [tab, setTab] = useState<"fees" | "receipts">("fees");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRow | null>(null);

  const feeSummary = useQuery<FeeSummary>({
    queryKey: ["fees", "summary", wallet],
    queryFn: async () => {
      const { data } = await api.get<ApiResult<FeeSummary>>("/fees/summary", {
        params: wallet ? { wallet } : {},
      });
      return data.data;
    },
    enabled: !!wallet,
  });

  const fees = useQuery<Fee[]>({
    queryKey: ["fees", "list", wallet],
    queryFn: async () => {
      const { data } = await api.get<ApiResult<Fee[]>>("/fees", {
        params: wallet ? { wallet, limit: 100 } : { limit: 100 },
      });
      return data.data;
    },
    enabled: !!wallet,
  });

  const receipts = useQuery<ReceiptRow[]>({
    queryKey: ["receipts", "list", wallet],
    queryFn: async () => {
      const { data } = await api.get<ApiResult<ReceiptRow[]>>("/fees/receipts", {
        params: { wallet },
      });
      return data.data;
    },
    enabled: !!wallet,
  });

  const emailMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      const token = localStorage.getItem("pm_jwt");
      await api.post(`/fees/receipts/${receiptId}/email`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    },
    onSuccess: () => {
      toast.success("Receipt emailed successfully");
      receipts.refetch();
    },
    onError: () => {
      toast.error("Failed to send email. Set your email in Settings first.");
    },
  });

  const totalFees = feeSummary.data?.totalFees ?? 0;
  const totalTxns = feeSummary.data?.totalTransactions ?? 0;
  const avgFee = totalTxns > 0 ? totalFees / totalTxns : 0;

  if (!wallet) {
    return (
      <div className="min-h-full">
        <Header title="Fees & Receipts" />
        <div className="flex flex-col items-center justify-center gap-4 p-20 text-center">
          <Receipt className="h-12 w-12 text-[var(--text-faint)]" />
          <h2 className="text-lg font-semibold">Connect Your Wallet</h2>
          <p className="text-sm text-[var(--text-muted)]">Connect your wallet to view your fee history and transaction receipts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <Header title="Fees & Receipts" />

      {/* KPI Cards */}
      <section className="grid gap-4 p-6 sm:grid-cols-3">
        {feeSummary.isLoading ? (
          <>
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </>
        ) : (
          <>
            <KPICard title="Total Fees Paid" value={`${formatUsdcRaw(totalFees)} USDC`} delta="0.5% per transaction" />
            <KPICard title="Total Transactions" value={String(totalTxns)} delta="vault creations" />
            <KPICard title="Average Fee" value={`${formatUsdcRaw(avgFee)} USDC`} delta="per transaction" />
          </>
        )}
      </section>

      {/* Tab selector */}
      <div className="flex items-center gap-1 px-6">
        <button
          onClick={() => setTab("fees")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "fees" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
          }`}
        >
          Fee History
        </button>
        <button
          onClick={() => setTab("receipts")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "receipts" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
          }`}
        >
          Receipts
        </button>
      </div>

      {/* Fee History Table */}
      {tab === "fees" ? (
        <section className="p-6">
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-xs font-medium text-[var(--text-muted)]">
              <span>Transaction</span>
              <span>Vault Amount</span>
              <span>Fee Rate</span>
              <span>Fee Charged</span>
              <span>Date</span>
            </div>
            {fees.isLoading ? (
              <>
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </>
            ) : (fees.data ?? []).length > 0 ? (
              (fees.data ?? []).map((fee) => (
                <div
                  key={fee.id}
                  className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-2 border-b border-[var(--border)] px-4 py-3 text-sm last:border-b-0 hover:bg-[var(--surface-2)] transition"
                >
                  <a
                    href={explorerTxUrl(fee.tx_signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-xs text-[var(--primary)] hover:underline"
                  >
                    {truncateTxSignature(fee.tx_signature)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="tabular-nums">{formatUsdcRaw(fee.vault_amount_usdc)} USDC</span>
                  <span className="text-[var(--text-muted)]">{fee.fee_percentage}%</span>
                  <span className="tabular-nums font-medium">{formatUsdcRaw(fee.amount_usdc)} USDC</span>
                  <span className="text-[var(--text-muted)]">{timeAgo(fee.created_at)}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
                No fees recorded yet. Fees are collected when you create vaults.
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* Receipts Table */}
      {tab === "receipts" ? (
        <section className="p-6">
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_0.6fr] gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-xs font-medium text-[var(--text-muted)]">
              <span>Type</span>
              <span>Amount</span>
              <span>Fee</span>
              <span>Transaction</span>
              <span>Date</span>
              <span>Actions</span>
            </div>
            {receipts.isLoading ? (
              <>
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </>
            ) : (receipts.data ?? []).length > 0 ? (
              (receipts.data ?? []).map((receipt) => (
                <div
                  key={receipt.id}
                  className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_0.6fr] gap-2 border-b border-[var(--border)] px-4 py-3 text-sm last:border-b-0 hover:bg-[var(--surface-2)] transition items-center"
                >
                  <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${receiptTypeBadgeColor(receipt.receipt_type)}`}>
                    {receiptTypeLabel(receipt.receipt_type)}
                  </span>
                  <span className="tabular-nums">{formatUsdcRaw(receipt.amount_usdc)} USDC</span>
                  <span className="tabular-nums text-[var(--text-muted)]">
                    {receipt.fee_usdc > 0 ? `${formatUsdcRaw(receipt.fee_usdc)} USDC` : "—"}
                  </span>
                  <a
                    href={explorerTxUrl(receipt.tx_signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-xs text-[var(--primary)] hover:underline"
                  >
                    {truncateTxSignature(receipt.tx_signature)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-[var(--text-muted)] text-xs">{timeAgo(receipt.created_at)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedReceipt(receipt)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] transition hover:text-[var(--text)] hover:bg-[var(--surface-3)]"
                      title="View receipt"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => emailMutation.mutate(receipt.id)}
                      disabled={emailMutation.isPending}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] transition hover:text-[var(--primary)] hover:bg-[var(--primary-subtle)] disabled:opacity-40"
                      title={receipt.emailed_at ? `Emailed ${timeAgo(receipt.emailed_at)}` : "Email receipt"}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
                No receipts yet. Receipts are generated for every vault action.
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* Receipt Detail Modal */}
      {selectedReceipt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedReceipt(null)}>
          <div
            className="relative mx-4 w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h3 className="text-base font-semibold">Transaction Receipt</h3>
              <button onClick={() => setSelectedReceipt(null)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-5 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Type</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${receiptTypeBadgeColor(selectedReceipt.receipt_type)}`}>
                  {receiptTypeLabel(selectedReceipt.receipt_type)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-3">
                <span className="text-[var(--text-muted)]">Date</span>
                <span>{new Date(selectedReceipt.created_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-3">
                <span className="text-[var(--text-muted)]">Transaction</span>
                <a
                  href={explorerTxUrl(selectedReceipt.tx_signature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-mono text-xs text-[var(--primary)] hover:underline"
                >
                  {truncateTxSignature(selectedReceipt.tx_signature)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-3">
                <span className="text-[var(--text-muted)]">From</span>
                <span className="font-mono text-xs">{truncateAddress(selectedReceipt.wallet_address)}</span>
              </div>
              {selectedReceipt.recipient_wallet ? (
                <div className="flex justify-between border-t border-[var(--border)] pt-3">
                  <span className="text-[var(--text-muted)]">To</span>
                  <span className="font-mono text-xs">{truncateAddress(selectedReceipt.recipient_wallet)}</span>
                </div>
              ) : null}
              {selectedReceipt.description ? (
                <div className="flex justify-between border-t border-[var(--border)] pt-3">
                  <span className="text-[var(--text-muted)]">Description</span>
                  <span className="max-w-[60%] text-right">{selectedReceipt.description}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-[var(--border)] pt-3">
                <span className="text-[var(--text-muted)]">Amount</span>
                <span className="tabular-nums font-semibold">{formatUsdcRaw(selectedReceipt.amount_usdc)} USDC</span>
              </div>
              {selectedReceipt.fee_usdc > 0 ? (
                <>
                  <div className="flex justify-between border-t border-[var(--border)] pt-3">
                    <span className="text-[var(--text-muted)]">Platform Fee (0.5%)</span>
                    <span className="tabular-nums text-[var(--text-muted)]">{formatUsdcRaw(selectedReceipt.fee_usdc)} USDC</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-[var(--primary-subtle)] px-3 py-2">
                    <span className="font-medium">Total Charged</span>
                    <span className="tabular-nums font-bold text-[var(--primary)]">
                      {formatUsdcRaw(selectedReceipt.amount_usdc + selectedReceipt.fee_usdc)} USDC
                    </span>
                  </div>
                </>
              ) : null}
              {selectedReceipt.emailed_at ? (
                <div className="flex justify-between border-t border-[var(--border)] pt-3">
                  <span className="text-[var(--text-muted)]">Last Emailed</span>
                  <span className="text-xs text-[var(--text-muted)]">{timeAgo(selectedReceipt.emailed_at)}</span>
                </div>
              ) : null}
            </div>
            <div className="flex gap-2 border-t border-[var(--border)] px-5 py-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  window.open(`${process.env.NEXT_PUBLIC_API_URL}/fees/receipts/${selectedReceipt.tx_signature}/html`, "_blank");
                }}
              >
                <Download className="h-3.5 w-3.5" /> View HTML
              </Button>
              <Button
                size="sm"
                onClick={() => emailMutation.mutate(selectedReceipt.id)}
                loading={emailMutation.isPending}
              >
                <Mail className="h-3.5 w-3.5" /> Email Receipt
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
