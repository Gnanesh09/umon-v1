"use client";

import { type ReactNode, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { truncateAddress, truncateTxSignature, timeAgo } from "@/lib/format";
import { explorerTxUrl, explorerAddressUrl } from "@/lib/constants";
import { CopyButton } from "@/components/atoms/CopyButton";
import { toast } from "sonner";
import {
  Bot,
  ArrowLeft,
  Shield,
  ShieldOff,
  ShieldAlert,
  Wallet,
  DollarSign,
  Clock,
  Activity,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  XCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Zap,
  AlertTriangle,
  Ban,
} from "lucide-react";
import Link from "next/link";

type AgentTransaction = {
  id: string;
  agent_wallet_id: string;
  tx_type: string;
  amount_usdc: number;
  to_wallet: string | null;
  from_wallet: string | null;
  memo: string | null;
  tx_signature: string | null;
  status: string;
  error_message: string | null;
  guardrail_check: Record<string, { passed: boolean; detail: string }>;
  created_at: string;
  confirmed_at: string | null;
};

type AgentDetail = {
  id: string;
  owner_wallet: string;
  name: string;
  description: string | null;
  public_key: string;
  daily_limit_usdc: number;
  per_tx_limit_usdc: number;
  allowed_categories: string[];
  allowed_recipients: string[];
  total_funded_usdc: number;
  total_spent_usdc: number;
  spent_today_usdc: number;
  status: string;
  created_at: string;
  balance: { sol: number; usdc: number };
  transactions: AgentTransaction[];
};

function formatUsdc(lamports: number): string {
  return `$${(lamports / 1_000_000).toFixed(2)}`;
}

const TX_STATUS_STYLE: Record<string, string> = {
  completed: "bg-emerald-500/15 text-emerald-400",
  pending: "bg-amber-500/15 text-amber-400",
  confirming: "bg-blue-500/15 text-blue-400",
  failed: "bg-red-500/10 text-red-400",
  rejected: "bg-red-500/10 text-red-400",
};

const TX_TYPE_ICON: Record<string, typeof ArrowUpRight> = {
  pay: ArrowUpRight,
  fund: ArrowDownLeft,
  receive: ArrowDownLeft,
  refund: ArrowDownLeft,
};

export default function AgentDetailPage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const agentId = params.id as string;
  const [showRevoke, setShowRevoke] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenVisible, setTokenVisible] = useState(false);

  const agentQuery = useQuery({
    queryKey: ["agent-wallet", agentId],
    queryFn: async () => {
      const res = await api.get<ApiResult<AgentDetail>>(`/agent-wallets/${agentId}`);
      return res.data.data;
    },
    enabled: !!user && !!agentId,
  });

  const freezeMut = useMutation({
    mutationFn: async (action: "freeze" | "unfreeze") => {
      await api.post(`/agent-wallets/${agentId}/${action}`);
    },
    onSuccess: (_, action) => {
      toast.success(action === "freeze" ? "Agent frozen" : "Agent activated");
      queryClient.invalidateQueries({ queryKey: ["agent-wallet", agentId] });
    },
  });

  const revokeMut = useMutation({
    mutationFn: async () => {
      await api.post(`/agent-wallets/${agentId}/revoke`);
    },
    onSuccess: () => {
      toast.success("Agent permanently revoked");
      setShowRevoke(false);
      queryClient.invalidateQueries({ queryKey: ["agent-wallet", agentId] });
    },
  });

  const regenMut = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResult<{ apiToken: string }>>(`/agent-wallets/${agentId}/regenerate-token`);
      return res.data.data;
    },
    onSuccess: (data) => {
      setNewToken(data.apiToken);
      toast.success("New API token generated");
    },
  });

  const agent = agentQuery.data;

  if (agentQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[var(--text-faint)]" size={24} />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="py-20 text-center">
        <Bot size={48} className="mx-auto mb-3 text-[var(--text-faint)]" />
        <p className="text-[var(--text-muted)]">Agent wallet not found</p>
        <Link href="/merchant/agents" className="mt-3 inline-flex items-center gap-1 text-sm text-[var(--primary)]">
          <ArrowLeft size={14} /> Back to agents
        </Link>
      </div>
    );
  }

  const remaining = agent.total_funded_usdc - agent.total_spent_usdc;
  const spentPct = agent.total_funded_usdc > 0
    ? Math.min(100, (agent.total_spent_usdc / agent.total_funded_usdc) * 100)
    : 0;

  return (
    <div>
      {/* Back nav */}
      <Link
        href="/merchant/agents"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
      >
        <ArrowLeft size={14} />
        Back to Agents
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
            agent.status === "active" ? "bg-emerald-500/10" : agent.status === "frozen" ? "bg-amber-500/10" : "bg-red-500/10"
          }`}>
            <Bot size={28} className={
              agent.status === "active" ? "text-emerald-400" : agent.status === "frozen" ? "text-amber-400" : "text-red-400"
            } />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">{agent.name}</h1>
            {agent.description && <p className="text-sm text-[var(--text-muted)]">{agent.description}</p>}
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                agent.status === "active" ? "bg-emerald-500/10 text-emerald-400"
                : agent.status === "frozen" ? "bg-amber-500/10 text-amber-400"
                : "bg-red-500/10 text-red-400"
              }`}>
                {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
              </span>
              <span className="text-[10px] text-[var(--text-faint)]">Created {timeAgo(agent.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {agent.status === "active" && (
            <button
              onClick={() => freezeMut.mutate("freeze")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-500/10"
            >
              <ShieldOff size={14} /> Freeze
            </button>
          )}
          {agent.status === "frozen" && (
            <button
              onClick={() => freezeMut.mutate("unfreeze")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/10"
            >
              <Shield size={14} /> Activate
            </button>
          )}
          {agent.status !== "revoked" && (
            <button
              onClick={() => setShowRevoke(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
            >
              <Ban size={14} /> Revoke
            </button>
          )}
        </div>
      </div>

      {/* Revoke confirmation */}
      {showRevoke && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
            <AlertTriangle size={16} /> Permanently revoke this agent?
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            This action cannot be undone. The agent will lose all access and cannot be reactivated.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => revokeMut.mutate()}
              disabled={revokeMut.isPending}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
            >
              {revokeMut.isPending ? "Revoking..." : "Yes, Revoke Permanently"}
            </button>
            <button
              onClick={() => setShowRevoke(false)}
              className="rounded-lg px-4 py-1.5 text-xs text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-faint)]">USDC Balance</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">{formatUsdc(agent.balance.usdc)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-faint)]">SOL Balance</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">{agent.balance.sol.toFixed(4)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-faint)]">Total Spent</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">{formatUsdc(agent.total_spent_usdc)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-faint)]">Spent Today</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">{formatUsdc(agent.spent_today_usdc)}</p>
          <p className="mt-0.5 text-[10px] text-[var(--text-faint)]">
            Limit: {formatUsdc(agent.daily_limit_usdc)}/day
          </p>
        </div>
      </div>

      {/* Wallet & Limits */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Wallet Info */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">Wallet Address</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--text-muted)] break-all">
              {agent.public_key}
            </code>
            <CopyButton text={agent.public_key} />
            <a
              href={explorerAddressUrl(agent.public_key)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-[var(--text-faint)] transition hover:text-[var(--primary)]"
            >
              <ExternalLink size={14} />
            </a>
          </div>

          {agent.total_funded_usdc > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-[var(--text-faint)]">
                <span>Budget used</span>
                <span>{formatUsdc(agent.total_spent_usdc)} / {formatUsdc(agent.total_funded_usdc)}</span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all"
                  style={{ width: `${spentPct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-[var(--text-faint)]">{formatUsdc(remaining)} remaining</p>
            </div>
          )}
        </div>

        {/* Limits & API Token */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">Guardrails & API</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2">
              <span className="text-xs text-[var(--text-muted)]">Daily Limit</span>
              <span className="text-xs font-semibold text-[var(--text)]">{formatUsdc(agent.daily_limit_usdc)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2">
              <span className="text-xs text-[var(--text-muted)]">Per-Tx Limit</span>
              <span className="text-xs font-semibold text-[var(--text)]">{formatUsdc(agent.per_tx_limit_usdc)}</span>
            </div>
            {agent.allowed_categories.length > 0 && (
              <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
                <span className="text-xs text-[var(--text-muted)]">Allowed Categories</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {agent.allowed_categories.map((c) => (
                    <span key={c} className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] text-[var(--primary)]">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Regenerate token */}
          <div className="mt-3 border-t border-[var(--border)] pt-3">
            {newToken ? (
              <div>
                <p className="text-xs font-semibold text-amber-400">New token — save it now:</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-[var(--surface-2)] px-2 py-1.5 font-mono text-[10px] text-[var(--text)] break-all">
                    {tokenVisible ? newToken : newToken.slice(0, 12) + "•".repeat(20)}
                  </code>
                  <button onClick={() => setTokenVisible(!tokenVisible)} className="text-[var(--text-faint)]">
                    {tokenVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <CopyButton text={newToken} />
                </div>
              </div>
            ) : (
              <button
                onClick={() => regenMut.mutate()}
                disabled={regenMut.isPending}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
              >
                <RefreshCw size={12} />
                {regenMut.isPending ? "Generating..." : "Regenerate API Token"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">Transaction History</h3>
        </div>

        {agent.transactions.length === 0 ? (
          <div className="py-12 text-center">
            <Activity size={32} className="mx-auto mb-2 text-[var(--text-faint)]" />
            <p className="text-sm text-[var(--text-muted)]">No transactions yet</p>
            <p className="mt-1 text-xs text-[var(--text-faint)]">
              Transactions will appear here when the agent starts making payments.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {agent.transactions.map((tx) => {
              const TxIcon = TX_TYPE_ICON[tx.tx_type] ?? Activity;
              const isOutgoing = tx.tx_type === "pay";

              return (
                <div key={tx.id} className="px-5 py-3 transition hover:bg-[var(--surface-2)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        tx.status === "rejected" ? "bg-red-500/10" : isOutgoing ? "bg-[var(--primary)]/10" : "bg-emerald-500/10"
                      }`}>
                        {tx.status === "rejected" ? (
                          <XCircle size={14} className="text-red-400" />
                        ) : (
                          <TxIcon size={14} className={isOutgoing ? "text-[var(--primary)]" : "text-emerald-400"} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--text)]">
                            {isOutgoing ? "-" : "+"}{formatUsdc(tx.amount_usdc)}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${TX_STATUS_STYLE[tx.status] ?? "bg-[var(--surface-3)] text-[var(--text-muted)]"}`}>
                            {tx.status}
                          </span>
                          <code className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-faint)]">
                            {tx.id.slice(0, 8)}
                          </code>
                        </div>
                        <p className="text-[10px] text-[var(--text-faint)]">
                          {tx.tx_type.toUpperCase()}
                          {tx.to_wallet && <> &rarr; {truncateAddress(tx.to_wallet)}</>}
                          {tx.memo && <> &middot; {tx.memo}</>}
                          {" · "}{timeAgo(tx.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {tx.tx_signature && (
                        <a
                          href={explorerTxUrl(tx.tx_signature)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--primary)] transition hover:underline"
                        >
                          {truncateTxSignature(tx.tx_signature)}
                          <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Show guardrail rejection details */}
                  {tx.status === "rejected" && tx.error_message && (
                    <div className="mt-2 ml-11 rounded-lg bg-red-500/[0.06] px-3 py-2">
                      <p className="text-[10px] font-medium text-red-400">Guardrail violation</p>
                      <p className="mt-0.5 text-[10px] text-[var(--text-faint)]">{tx.error_message}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
