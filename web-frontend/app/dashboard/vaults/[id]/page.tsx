"use client";

import { ReactNode, useState, useEffect, useCallback } from "react";
import { Header } from "@/components/organisms/Header";
import { useParams, useRouter } from "next/navigation";
import { useVault } from "@/hooks/useVault";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { CopyButton } from "@/components/atoms/CopyButton";
import { Spinner } from "@/components/atoms/Spinner";
import { TransactionRow } from "@/components/molecules/TransactionRow";
import { VaultCardSkeleton, TableRowSkeleton } from "@/components/atoms/Skeleton";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  Split,
  Zap,
  ShoppingBag,
  ExternalLink,
  AlertTriangle,
  XCircle,
  Receipt,
  Mail,
} from "lucide-react";
import {
  releaseTimeLockOnChain,
  approveMilestoneOnChain,
  executeSplitOnChain,
  cancelVaultOnChain,
  raiseDisputeOnChain,
  voteDisputeOnChain,
  triggerOracleOnChain,
} from "@/lib/anchor";
import { api, type ApiResult } from "@/lib/api";
import {
  formatUsdc,
  formatUsdcRaw,
  truncateAddress,
  formatCountdown,
  conditionTypeLabel,
  timeAgo,
} from "@/lib/format";
import { explorerTxUrl, explorerAddressUrl, ORACLE_FEEDS } from "@/lib/constants";
import type { Vault, Condition } from "@/types/domain";

type Transaction = {
  id: string;
  tx_signature: string;
  tx_type: string;
  amount_usdc: number | null;
  from_wallet: string | null;
  to_wallet: string | null;
  condition_type: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export default function VaultDetailPage(): ReactNode {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();
  const vaultQuery = useVault(params.id);
  const vault = vaultQuery.data?.data as Vault | undefined;
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [jurorInputs, setJurorInputs] = useState<string[]>(["", "", ""]);
  const [countdown, setCountdown] = useState("");

  const txQuery = useQuery({
    queryKey: ["vault-transactions", params.id],
    queryFn: async () => {
      const res = await api.get<ApiResult<Transaction[]>>(`/vaults/${params.id}/transactions`);
      return res.data;
    },
    enabled: params.id.length > 0,
    refetchInterval: 15_000,
  });

  const transactions = txQuery.data?.data ?? [];

  type ReceiptRow = {
    id: string;
    tx_signature: string;
    receipt_type: string;
    amount_usdc: number;
    fee_usdc: number;
    emailed_at: string | null;
    created_at: string;
  };

  const receiptsQuery = useQuery({
    queryKey: ["vault-receipts", params.id, transactions.length],
    queryFn: async () => {
      const walletAddr = wallet?.publicKey?.toBase58();
      if (!walletAddr) return [];
      const res = await api.get<ApiResult<ReceiptRow[]>>("/fees/receipts", { params: { wallet: walletAddr } });
      const txSigs = new Set(transactions.map((tx) => tx.tx_signature));
      if (vault?.tx_signature) txSigs.add(vault.tx_signature);
      return (res.data.data ?? []).filter((r) => txSigs.has(r.tx_signature));
    },
    enabled: !!wallet && !!vault,
  });

  const vaultReceipts = receiptsQuery.data ?? [];

  const emailReceiptMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      const token = localStorage.getItem("pm_jwt");
      await api.post(`/fees/receipts/${receiptId}/email`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    },
    onSuccess: () => {
      toast.success("Receipt emailed successfully");
      receiptsQuery.refetch();
    },
    onError: () => toast.error("Failed to email receipt. Set your email in Settings."),
  });

  const disputeQuery = useQuery({
    queryKey: ["vault-dispute", params.id],
    queryFn: async () => {
      const res = await api.get<ApiResult<{ id: string; plaintiff_wallet: string; defendant_wallet: string; reason: string; status: string; jurors: string[] | null; votes_for_plaintiff: number; votes_for_defendant: number; deadline: string; created_at: string }>>(`/vaults/${params.id}/dispute`);
      return res.data?.data ?? null;
    },
    enabled: vault?.status === "disputed",
    refetchInterval: 15_000,
  });

  const dispute = disputeQuery.data;

  const firstOracleCondition = vault?.conditions?.find((c) => c.type === "oracle") as
    | Extract<Condition, { type: "oracle" }>
    | undefined;

  const oracleFeedLabel = firstOracleCondition?.feed
    ? Object.values(ORACLE_FEEDS).find((f) => f.address === firstOracleCondition.feed)?.label ?? "Unknown Feed"
    : null;

  const oraclePriceQuery = useQuery({
    queryKey: ["oracle-price", firstOracleCondition?.feed],
    queryFn: async () => {
      const feed = firstOracleCondition!.feed;
      const coinIds: Record<string, string> = {};
      for (const [key, val] of Object.entries(ORACLE_FEEDS)) {
        coinIds[val.address] = key.replace("_usd", "");
      }
      const coinId = coinIds[feed];
      if (!coinId) return null;
      const coinMap: Record<string, string> = { sol: "solana", btc: "bitcoin", eth: "ethereum" };
      const geckoId = coinMap[coinId] ?? coinId;
      const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`);
      const data = (await resp.json()) as Record<string, { usd?: number }>;
      return data[geckoId]?.usd ?? null;
    },
    enabled: !!firstOracleCondition?.feed,
    refetchInterval: 30_000,
  });

  const firstTimeLock = vault?.conditions?.find((c) => c.type === "time_lock") as
    | Extract<Condition, { type: "time_lock" }>
    | undefined;

  useEffect(() => {
    if (!firstTimeLock) return;
    const interval = setInterval(() => {
      setCountdown(formatCountdown(firstTimeLock.releaseTime));
    }, 1000);
    setCountdown(formatCountdown(firstTimeLock.releaseTime));
    return () => clearInterval(interval);
  }, [firstTimeLock]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["vault", params.id] });
    queryClient.invalidateQueries({ queryKey: ["vault-transactions", params.id] });
    queryClient.invalidateQueries({ queryKey: ["vaults"] });
  }, [queryClient, params.id]);

  const syncAction = async (opts: {
    txSignature: string;
    txType: string;
    conditionType?: string;
    conditionIndex?: number;
    releaseAmountUsdc?: number;
  }): Promise<void> => {
    try {
      await api.post(`/vaults/${params.id}/record-action`, opts);
    } catch (e) {
      console.error("Backend sync failed:", e);
    }
    invalidate();
  };

  const parseOnChainError = (error: unknown): string => {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("VaultNotActive")) return "This vault is no longer active on-chain. It may have already been fully released, cancelled, or disputed. Refreshing...";
    if (msg.includes("ConditionNotMet")) return "Condition not met on-chain. The condition may have already been fulfilled.";
    if (msg.includes("UnauthorizedApprover")) return "Your wallet is not authorized for this action.";
    if (msg.includes("AlreadyApproved")) return "You have already approved this milestone.";
    if (msg.includes("TimeLockNotExpired")) return "The time lock has not expired yet.";
    if (msg.includes("InsufficientFunds")) return "Insufficient funds in the vault.";
    if (msg.includes("already been processed")) return "Transaction already processed. Please wait a moment and try again.";
    return msg;
  };

  const handleRelease = async (conditionIndex: number): Promise<void> => {
    if (!wallet || !vault) return;
    setActionLoading(`release-${conditionIndex}`);
    try {
      const sig = await releaseTimeLockOnChain(
        wallet,
        new PublicKey(vault.on_chain_id),
        new PublicKey(vault.recipient_wallet),
        conditionIndex,
      );
      const condition = vault.conditions[conditionIndex];
      const percentage = condition && "percentage" in condition ? Number(condition.percentage) : 0;
      const releaseAmount = Math.floor((vault.amount_usdc * percentage) / 100);
      toast.success(`Funds released! Tx: ${sig.slice(0, 12)}...`);
      await syncAction({ txSignature: sig, txType: "release", conditionType: "time_lock", conditionIndex, releaseAmountUsdc: releaseAmount });
    } catch (error) {
      const msg = parseOnChainError(error);
      toast.error(msg);
      if (msg.includes("Refreshing")) invalidate();
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (conditionIndex: number): Promise<void> => {
    if (!wallet || !vault) return;
    setActionLoading(`approve-${conditionIndex}`);
    try {
      const sig = await approveMilestoneOnChain(
        wallet,
        new PublicKey(vault.on_chain_id),
        new PublicKey(vault.recipient_wallet),
        conditionIndex,
      );
      const condition = vault.conditions[conditionIndex];
      const approverCount = condition?.type === "milestone" ? (condition.approvers ?? []).length : 1;
      const isLastApprover = approverCount <= 1;
      const percentage = condition && "percentage" in condition ? Number(condition.percentage) : 0;
      const releaseAmount = isLastApprover ? Math.floor((vault.amount_usdc * percentage) / 100) : 0;
      toast.success(`Milestone approved! Tx: ${sig.slice(0, 12)}...`);
      await syncAction({ txSignature: sig, txType: "milestone_approve", conditionType: "milestone", conditionIndex, releaseAmountUsdc: releaseAmount });
    } catch (error) {
      const msg = parseOnChainError(error);
      toast.error(msg);
      if (msg.includes("Refreshing")) invalidate();
    } finally {
      setActionLoading(null);
    }
  };

  const handleSplit = async (conditionIndex: number, condition: Extract<Condition, { type: "auto_split" }>): Promise<void> => {
    if (!wallet || !vault) return;
    setActionLoading(`split-${conditionIndex}`);
    try {
      const recipients = condition.splits.map((s) => new PublicKey(s.wallet));
      const sig = await executeSplitOnChain(
        wallet,
        new PublicKey(vault.on_chain_id),
        conditionIndex,
        recipients,
      );
      const remaining = vault.amount_usdc - vault.released_amount_usdc;
      toast.success(`Split executed! Tx: ${sig.slice(0, 12)}...`);
      await syncAction({ txSignature: sig, txType: "split", conditionType: "auto_split", conditionIndex, releaseAmountUsdc: remaining });
    } catch (error) {
      const msg = parseOnChainError(error);
      toast.error(msg);
      if (msg.includes("Refreshing")) invalidate();
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (!wallet || !vault) return;
    if (vault.released_amount_usdc > 0) {
      toast.error(`Cannot cancel — ${formatUsdc(vault.released_amount_usdc)} has already been released from this vault.`);
      return;
    }
    if (vault.status !== "active") {
      toast.error(`Cannot cancel — vault status is "${vault.status}". Only active vaults with no released funds can be cancelled.`);
      invalidate();
      return;
    }
    setActionLoading("cancel");
    try {
      const sig = await cancelVaultOnChain(wallet, new PublicKey(vault.on_chain_id));
      toast.success(`Vault cancelled! Tx: ${sig.slice(0, 12)}...`);
      await syncAction({ txSignature: sig, txType: "cancel" });
    } catch (error) {
      const msg = parseOnChainError(error);
      toast.error(msg);
      if (msg.includes("Refreshing")) invalidate();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispute = async (): Promise<void> => {
    if (!wallet || !vault || !disputeReason.trim()) return;
    const validJurors = jurorInputs.filter((j) => j.trim().length > 0);
    if (validJurors.length < 3) {
      toast.error("You need at least 3 juror wallet addresses.");
      return;
    }
    if (validJurors.length > 7) {
      toast.error("Maximum 7 jurors allowed.");
      return;
    }
    let jurorPubkeys: PublicKey[];
    try {
      jurorPubkeys = validJurors.map((j) => new PublicKey(j.trim()));
    } catch {
      toast.error("One or more juror addresses are invalid Solana wallet addresses.");
      return;
    }
    setActionLoading("dispute");
    try {
      const sig = await raiseDisputeOnChain(
        wallet,
        new PublicKey(vault.on_chain_id),
        disputeReason,
        jurorPubkeys,
      );
      toast.success(`Dispute raised! Tx: ${sig.slice(0, 12)}...`);
      try {
        const token = localStorage.getItem("pm_jwt");
        await api.post(`/vaults/${params.id}/raise-dispute`, {
          reason: disputeReason,
          jurors: validJurors.map((j) => j.trim()),
          txSignature: sig,
        }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      } catch { /* backend sync is best-effort */ }
      await syncAction({ txSignature: sig, txType: "dispute" });
      setShowDispute(false);
      setDisputeReason("");
      setJurorInputs(["", "", ""]);
    } catch (error) {
      const msg = parseOnChainError(error);
      toast.error(msg);
      if (msg.includes("Refreshing")) invalidate();
    } finally {
      setActionLoading(null);
    }
  };

  const handleVote = async (voteForPlaintiff: boolean): Promise<void> => {
    if (!wallet || !vault) return;
    setActionLoading(voteForPlaintiff ? "vote-plaintiff" : "vote-defendant");
    try {
      const sig = await voteDisputeOnChain(
        wallet,
        new PublicKey(vault.on_chain_id),
        new PublicKey(vault.creator_wallet),
        new PublicKey(vault.recipient_wallet),
        voteForPlaintiff,
      );
      toast.success(`Vote cast! Tx: ${sig.slice(0, 12)}...`);
      try {
        const token = localStorage.getItem("pm_jwt");
        await api.post(`/vaults/${params.id}/vote-dispute`, {
          voteForPlaintiff,
          txSignature: sig,
        }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      } catch { /* backend sync is best-effort */ }
      await syncAction({ txSignature: sig, txType: "dispute_vote" });
      disputeQuery.refetch();
    } catch (error) {
      const msg = parseOnChainError(error);
      toast.error(msg);
      if (msg.includes("Refreshing")) invalidate();
    } finally {
      setActionLoading(null);
    }
  };

  const handleOracleTrigger = async (conditionIndex: number, condition: Extract<Condition, { type: "oracle" }>): Promise<void> => {
    if (!wallet || !vault) return;
    const currentPrice = oraclePriceQuery.data;
    if (currentPrice == null) {
      toast.error("Unable to fetch current price. Try again.");
      return;
    }
    setActionLoading(`oracle-${conditionIndex}`);
    try {
      const sig = await triggerOracleOnChain(
        wallet,
        new PublicKey(vault.on_chain_id),
        new PublicKey(vault.recipient_wallet),
        conditionIndex,
        new PublicKey(condition.feed),
        Math.round(currentPrice * 100),
      );
      const percentage = condition.percentage ?? 0;
      const releaseAmount = Math.floor((vault.amount_usdc * percentage) / 100);
      toast.success(`Oracle triggered! Tx: ${sig.slice(0, 12)}...`);
      await syncAction({ txSignature: sig, txType: "oracle_trigger", conditionType: "oracle", conditionIndex, releaseAmountUsdc: releaseAmount });
    } catch (error) {
      const msg = parseOnChainError(error);
      toast.error(msg);
      if (msg.includes("Refreshing")) invalidate();
    } finally {
      setActionLoading(null);
    }
  };

  if (vaultQuery.isLoading) {
    return (
      <div className="min-h-full">
        <Header title="Vault Detail" />
        <div className="grid gap-4 p-6">
          <VaultCardSkeleton />
          <VaultCardSkeleton />
          {Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="min-h-full">
        <Header title="Vault Detail" />
        <div className="grid place-items-center p-20 text-center">
          <p className="text-[var(--text-muted)]">Vault not found</p>
          <Button variant="secondary" onClick={() => router.push("/dashboard/vaults")} className="mt-4">
            Back to Vaults
          </Button>
        </div>
      </div>
    );
  }

  const progress = vault.amount_usdc > 0 ? (vault.released_amount_usdc / vault.amount_usdc) * 100 : 0;
  const isCreator = wallet?.publicKey?.toBase58() === vault.creator_wallet;
  const canCancel = isCreator && vault.released_amount_usdc === 0 && vault.status === "active";

  return (
    <div className="min-h-full">
      <Header title="Vault Detail" />
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        {/* Header card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{vault.description || "Untitled Vault"}</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Created {new Date(vault.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge status={vault.status} />
              <a
                href={explorerAddressUrl(vault.on_chain_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)] transition hover:text-[var(--primary)]"
              >
                Explorer <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Total Locked</p>
              <p className="text-2xl font-bold tabular-nums">{formatUsdc(vault.amount_usdc)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Released</p>
              <p className="text-2xl font-bold tabular-nums text-[var(--success)]">{formatUsdc(vault.released_amount_usdc)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Remaining</p>
              <p className="text-2xl font-bold tabular-nums">{formatUsdc(vault.amount_usdc - vault.released_amount_usdc)}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Progress</span>
              <span className="tabular-nums">{progress.toFixed(1)}%</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-[var(--primary)]"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-[var(--text-muted)]">Creator: </span>
              <span className="font-mono">{truncateAddress(vault.creator_wallet)}</span>
              <CopyButton text={vault.creator_wallet} />
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Recipient: </span>
              <span className="font-mono">{truncateAddress(vault.recipient_wallet)}</span>
              <CopyButton text={vault.recipient_wallet} />
            </div>
          </div>
        </motion.div>

        {/* Fee & Receipts */}
        {vaultReceipts.length > 0 ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-muted)]">Fees & Receipts</h3>
            <div className="card overflow-hidden">
              {vaultReceipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-sm last:border-b-0">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-4 w-4 text-[var(--primary)]" />
                    <div>
                      <p className="text-xs font-medium capitalize">{receipt.receipt_type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-[var(--text-muted)]">{timeAgo(receipt.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {receipt.fee_usdc > 0 ? (
                      <span className="text-xs tabular-nums text-[var(--text-muted)]">Fee: {formatUsdcRaw(receipt.fee_usdc)} USDC</span>
                    ) : null}
                    <span className="text-sm tabular-nums font-medium">{formatUsdcRaw(receipt.amount_usdc)} USDC</span>
                    <div className="flex gap-1">
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL}/fees/receipts/${receipt.tx_signature}/html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] transition hover:text-[var(--primary)]"
                        title="View receipt"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => emailReceiptMutation.mutate(receipt.id)}
                        disabled={emailReceiptMutation.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] transition hover:text-[var(--primary)] disabled:opacity-40"
                        title={receipt.emailed_at ? `Last emailed ${timeAgo(receipt.emailed_at)}` : "Email receipt"}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Conditions */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-muted)]">Conditions</h3>
          <div className="grid gap-3">
            {(vault.conditions ?? []).map((condition, index) => {
              const Icon = condition.type === "time_lock" ? Clock : condition.type === "milestone" ? CheckCircle2 : condition.type === "auto_split" ? Split : condition.type === "oracle" ? Zap : ShoppingBag;
              const fulfilled = transactions.some((tx) => {
                const meta = tx.metadata as Record<string, unknown> | undefined;
                return meta?.conditionIndex === index && (tx.tx_type === "release" || tx.tx_type === "milestone_approve" || tx.tx_type === "split" || tx.tx_type === "oracle_trigger");
              });
              const vaultDone = vault.status === "released" || vault.status === "cancelled";
              const showAction = !vaultDone && !fulfilled;

              return (
                <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="card p-4">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${fulfilled ? "text-[var(--success)]" : "text-[var(--primary)]"}`} />
                    <span className="text-sm font-medium">{conditionTypeLabel(condition.type)}</span>
                    {fulfilled ? (
                      <span className="ml-auto rounded-full bg-[var(--success-subtle)] px-2 py-0.5 text-xs text-[var(--success)]">Fulfilled</span>
                    ) : "percentage" in condition ? (
                      <span className="ml-auto text-xs tabular-nums text-[var(--text-muted)]">{condition.percentage}%</span>
                    ) : null}
                  </div>

                  {condition.type === "time_lock" ? (
                    <div className="mt-3">
                      <p className="text-xs text-[var(--text-muted)]">
                        Release: {condition.releaseTime ? new Date(condition.releaseTime).toLocaleString() : "Not set"}
                      </p>
                      {!fulfilled && condition.releaseTime ? (
                        <p className="mt-1 font-mono text-sm tabular-nums">{countdown || "Calculating..."}</p>
                      ) : null}
                      {showAction && condition.releaseTime ? (
                        <Button
                          size="sm"
                          className="mt-2"
                          loading={actionLoading === `release-${index}`}
                          disabled={countdown !== "Expired" && !countdown.startsWith("-")}
                          onClick={() => void handleRelease(index)}
                        >
                          {countdown === "Expired" ? "Release Funds" : "Locked"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {condition.type === "milestone" ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs">{condition.description || "No description"}</p>
                      <div className="space-y-1">
                        {(condition.approvers ?? []).map((approver, aIdx) => (
                          <div key={aIdx} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className={`h-3 w-3 ${fulfilled ? "text-[var(--success)]" : "text-[var(--text-faint)]"}`} />
                            <span className="font-mono">{truncateAddress(approver)}</span>
                          </div>
                        ))}
                      </div>
                      {showAction ? (
                        <Button
                          size="sm"
                          loading={actionLoading === `approve-${index}`}
                          onClick={() => void handleApprove(index)}
                        >
                          Approve Milestone
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {condition.type === "auto_split" ? (
                    <div className="mt-3 space-y-2">
                      {(condition.splits ?? []).map((split, sIdx) => (
                        <div key={sIdx} className="flex items-center justify-between text-xs">
                          <span className="font-mono">{truncateAddress(split.wallet)}</span>
                          <span className="tabular-nums">{split.percentage}%</span>
                        </div>
                      ))}
                      {showAction ? (
                        <Button
                          size="sm"
                          loading={actionLoading === `split-${index}`}
                          onClick={() => void handleSplit(index, condition as Extract<Condition, { type: "auto_split" }>)}
                        >
                          Execute Split
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {condition.type === "oracle" ? (() => {
                    const feedLabel = Object.values(ORACLE_FEEDS).find((f) => f.address === condition.feed)?.label ?? truncateAddress(condition.feed ?? "");
                    const operatorLabels: Record<string, string> = { gt: ">", lt: "<", eq: "=", gte: "≥", lte: "≤" };
                    const opLabel = operatorLabels[condition.operator ?? ""] ?? condition.operator ?? "—";
                    const livePrice = oraclePriceQuery.data;
                    return (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-[var(--text-muted)]">Feed: </span>
                            <span className="font-medium">{feedLabel}</span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)]">Condition: </span>
                            <span className="font-mono font-medium">price {opLabel} ${condition.threshold}</span>
                          </div>
                        </div>
                        {livePrice != null ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[var(--text-muted)]">Live Price:</span>
                            <span className={`font-mono font-bold ${
                              (() => {
                                const met = condition.operator === "gt" ? livePrice > condition.threshold
                                  : condition.operator === "lt" ? livePrice < condition.threshold
                                  : condition.operator === "gte" ? livePrice >= condition.threshold
                                  : condition.operator === "lte" ? livePrice <= condition.threshold
                                  : livePrice === condition.threshold;
                                return met ? "text-[var(--success)]" : "text-[var(--text)]";
                              })()
                            }`}>
                              ${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {(() => {
                              const met = condition.operator === "gt" ? livePrice > condition.threshold
                                : condition.operator === "lt" ? livePrice < condition.threshold
                                : condition.operator === "gte" ? livePrice >= condition.threshold
                                : condition.operator === "lte" ? livePrice <= condition.threshold
                                : livePrice === condition.threshold;
                              return met ? <span className="rounded-full bg-[var(--success-subtle)] px-2 py-0.5 text-xs text-[var(--success)]">Condition Met</span> : null;
                            })()}
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--text-muted)]">Loading price...</p>
                        )}
                        {showAction ? (
                          <Button
                            size="sm"
                            className="mt-1"
                            loading={actionLoading === `oracle-${index}`}
                            disabled={livePrice == null || !(
                              condition.operator === "gt" ? livePrice > condition.threshold
                              : condition.operator === "lt" ? livePrice < condition.threshold
                              : condition.operator === "gte" ? livePrice >= condition.threshold
                              : condition.operator === "lte" ? livePrice <= condition.threshold
                              : livePrice === condition.threshold
                            )}
                            onClick={() => void handleOracleTrigger(index, condition as Extract<Condition, { type: "oracle" }>)}
                          >
                            <Zap className="h-3.5 w-3.5" /> Trigger Oracle Release
                          </Button>
                        ) : null}
                      </div>
                    );
                  })() : null}

                  {condition.type === "category" ? (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-1">
                        {(condition.categories ?? []).map((cat) => (
                          <span key={cat} className="rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-xs">{cat}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-muted)]">Transaction History</h3>
          <div className="card overflow-hidden">
            {txQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)
            ) : transactions.length === 0 ? (
              <p className="p-6 text-center text-sm text-[var(--text-muted)]">No transactions yet</p>
            ) : (
              transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
            )}
          </div>
        </div>

        {/* Dispute Info (shown when vault is disputed) */}
        {vault.status === "disputed" && dispute ? (
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-amber-600">Dispute Active</h3>
            <div className="space-y-3">
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-[var(--text-muted)]">Plaintiff: </span>
                  <span className="font-mono">{truncateAddress(dispute.plaintiff_wallet)}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Defendant: </span>
                  <span className="font-mono">{truncateAddress(dispute.defendant_wallet)}</span>
                </div>
              </div>
              <div className="text-xs">
                <span className="text-[var(--text-muted)]">Reason: </span>
                <span>{dispute.reason}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-[var(--text-muted)]">Votes For Plaintiff: </span>
                  <span className="font-bold text-[var(--success)]">{dispute.votes_for_plaintiff}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Votes For Defendant: </span>
                  <span className="font-bold text-red-500">{dispute.votes_for_defendant}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Status: </span>
                  <span className="font-medium capitalize">{dispute.status.replace(/_/g, " ")}</span>
                </div>
              </div>
              {dispute.jurors && dispute.jurors.length > 0 ? (
                <div className="text-xs">
                  <p className="text-[var(--text-muted)] mb-1">Jurors:</p>
                  <div className="space-y-1">
                    {dispute.jurors.map((juror, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="font-mono">{truncateAddress(juror)}</span>
                        {juror === wallet?.publicKey?.toBase58() ? (
                          <span className="rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-xs text-[var(--primary)]">You</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {dispute.status === "open" && dispute.jurors?.includes(wallet?.publicKey?.toBase58() ?? "") ? (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    loading={actionLoading === "vote-plaintiff"}
                    onClick={() => void handleVote(true)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Vote for Plaintiff
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={actionLoading === "vote-defendant"}
                    onClick={() => void handleVote(false)}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Vote for Defendant
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Actions */}
        {vault.status !== "released" && vault.status !== "cancelled" && vault.status !== "disputed" ? (
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-muted)]">Actions</h3>
            <div className="flex flex-wrap gap-2">
              {canCancel ? (
                <Button variant="danger" size="sm" loading={actionLoading === "cancel"} onClick={() => void handleCancel()}>
                  <XCircle className="h-4 w-4" /> Cancel Vault
                </Button>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDispute(!showDispute)}
              >
                <AlertTriangle className="h-4 w-4" /> Raise Dispute
              </Button>
            </div>
            {showDispute ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-3">
                <Input
                  label="Dispute Reason"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Describe the issue..."
                />
                <div>
                  <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Juror Wallets (3–7 required)</p>
                  {jurorInputs.map((juror, i) => (
                    <div key={i} className="mb-1.5 flex items-center gap-2">
                      <Input
                        value={juror}
                        onChange={(e) => {
                          const updated = [...jurorInputs];
                          updated[i] = e.target.value;
                          setJurorInputs(updated);
                        }}
                        placeholder={`Juror ${i + 1} wallet address`}
                      />
                      {jurorInputs.length > 3 ? (
                        <button
                          onClick={() => setJurorInputs(jurorInputs.filter((_, idx) => idx !== i))}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {jurorInputs.length < 7 ? (
                    <button
                      onClick={() => setJurorInputs([...jurorInputs, ""])}
                      className="text-xs text-[var(--primary)] hover:underline"
                    >
                      + Add juror
                    </button>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  loading={actionLoading === "dispute"}
                  onClick={() => void handleDispute()}
                  disabled={!disputeReason.trim() || jurorInputs.filter((j) => j.trim()).length < 3}
                >
                  Submit Dispute
                </Button>
              </motion.div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
