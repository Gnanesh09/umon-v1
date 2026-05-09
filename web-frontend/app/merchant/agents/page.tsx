"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { truncateAddress } from "@/lib/format";
import { CopyButton } from "@/components/atoms/CopyButton";
import { toast } from "sonner";
import Link from "next/link";
import {
  Bot,
  Plus,
  Wallet,
  Shield,
  ShieldOff,
  ShieldAlert,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
  Loader2,
  DollarSign,
  Zap,
  Clock,
  ArrowRight,
  Activity,
} from "lucide-react";

type AgentWallet = {
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
  balance?: { sol: number; usdc: number };
};

function formatUsdc(lamports: number): string {
  return `$${(lamports / 1_000_000).toFixed(2)}`;
}

const STATUS_CONFIG: Record<string, { icon: typeof Shield; color: string; bg: string; label: string }> = {
  active: { icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Active" },
  frozen: { icon: ShieldOff, color: "text-amber-400", bg: "bg-amber-500/10", label: "Frozen" },
  revoked: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10", label: "Revoked" },
};

export default function AgentsPage(): ReactNode {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dailyLimit, setDailyLimit] = useState("50");
  const [perTxLimit, setPerTxLimit] = useState("10");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenVisible, setTokenVisible] = useState(false);

  const agentsQuery = useQuery({
    queryKey: ["agent-wallets"],
    queryFn: async () => {
      const res = await api.get<ApiResult<AgentWallet[]>>("/agent-wallets");
      return res.data.data;
    },
    enabled: !!user,
  });

  const createMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post<ApiResult<{ wallet: AgentWallet; apiToken: string }>>("/agent-wallets", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success("Agent wallet created!");
      setNewToken(data.apiToken);
      queryClient.invalidateQueries({ queryKey: ["agent-wallets"] });
      setName("");
      setDescription("");
      setDailyLimit("50");
      setPerTxLimit("10");
    },
    onError: () => toast.error("Failed to create agent wallet"),
  });

  const freezeMut = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "freeze" | "unfreeze" }) => {
      await api.post(`/agent-wallets/${id}/${action}`);
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "freeze" ? "Agent frozen" : "Agent unfrozen");
      queryClient.invalidateQueries({ queryKey: ["agent-wallets"] });
    },
  });

  const handleCreate = () => {
    createMut.mutate({
      name,
      description: description || undefined,
      dailyLimitUsdc: Number(dailyLimit) * 1_000_000,
      perTxLimitUsdc: Number(perTxLimit) * 1_000_000,
    });
  };

  const agents = agentsQuery.data ?? [];
  const activeCount = agents.filter((a) => a.status === "active").length;
  const totalBudget = agents.reduce((s, a) => s + a.total_funded_usdc, 0);
  const totalSpent = agents.reduce((s, a) => s + a.total_spent_usdc, 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-cabinet text-2xl font-bold text-[var(--text)]">AI Agent Wallets</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create autonomous wallets for AI agents with programmable spending guardrails.
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setNewToken(null); }}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/20 transition hover:opacity-90"
        >
          <Plus size={16} />
          Create Agent
        </button>
      </div>

      {/* Stats */}
      {agents.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
              <Bot size={12} /> Total Agents
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--text)]">{agents.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Zap size={12} /> Active
            </div>
            <p className="mt-1 text-xl font-bold text-emerald-400">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
              <DollarSign size={12} /> Total Funded
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--text)]">{formatUsdc(totalBudget)}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
              <Activity size={12} /> Total Spent
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--text)]">{formatUsdc(totalSpent)}</p>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                  <Bot size={18} className="text-[var(--primary)]" />
                </div>
                <h2 className="text-lg font-bold text-[var(--text)]">
                  {newToken ? "Agent Created!" : "New Agent Wallet"}
                </h2>
              </div>
              <button
                onClick={() => { setShowCreate(false); setNewToken(null); }}
                className="rounded-lg p-1.5 text-[var(--text-faint)] transition hover:bg-[var(--surface-3)]"
              >
                <X size={18} />
              </button>
            </div>

            {newToken ? (
              <div className="px-6 py-5">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                  <p className="text-sm font-semibold text-amber-400">Save your API token now</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    This token is shown only once. Your AI agent will use it to authenticate with PowerMoney.
                  </p>
                </div>
                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">Agent API Token</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 font-mono text-xs text-[var(--text)] break-all">
                      {tokenVisible ? newToken : newToken.slice(0, 12) + "•".repeat(30)}
                    </code>
                    <button
                      onClick={() => setTokenVisible(!tokenVisible)}
                      className="rounded-lg p-2 text-[var(--text-faint)] hover:bg-[var(--surface-2)]"
                    >
                      {tokenVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <CopyButton text={newToken} />
                  </div>
                </div>
                <button
                  onClick={() => { setShowCreate(false); setNewToken(null); }}
                  className="mt-5 w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4 px-6 py-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">
                      Agent Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      placeholder="e.g. Marketing Agent, Support Bot"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      placeholder="What will this agent do?"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">
                        Daily Limit (USDC)
                      </label>
                      <div className="relative">
                        <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                        <input
                          type="number"
                          value={dailyLimit}
                          onChange={(e) => setDailyLimit(e.target.value)}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-3 pl-9 pr-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">
                        Per-Transaction Limit
                      </label>
                      <div className="relative">
                        <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                        <input
                          type="number"
                          value={perTxLimit}
                          onChange={(e) => setPerTxLimit(e.target.value)}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-3 pl-9 pr-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                      <Shield size={12} /> Guardrails
                    </div>
                    <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-faint)]">
                      <li className="flex items-center gap-2">
                        <Check size={10} className="text-emerald-400" />
                        Server-side keypair — agent never exposes your wallet
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={10} className="text-emerald-400" />
                        Per-transaction and daily spending limits enforced
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={10} className="text-emerald-400" />
                        Freeze or revoke instantly from the dashboard
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={10} className="text-emerald-400" />
                        Full audit trail — every transaction logged with tx signature
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="rounded-xl px-5 py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-3)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!name || createMut.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    Create Agent Wallet
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Agent Cards */}
      {agentsQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[var(--text-faint)]" size={24} />
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] py-20 text-center">
          <Bot size={48} className="mx-auto mb-3 text-[var(--text-faint)]" />
          <p className="font-medium text-[var(--text)]">No AI agents yet</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create your first agent wallet to enable AI-powered autonomous payments.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus size={16} />
            Create First Agent
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((agent) => {
            const config = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.active;
            const StatusIcon = config.icon;
            const remaining = agent.total_funded_usdc - agent.total_spent_usdc;
            const spentPct = agent.total_funded_usdc > 0
              ? Math.min(100, (agent.total_spent_usdc / agent.total_funded_usdc) * 100)
              : 0;

            return (
              <div
                key={agent.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--border-strong)] hover:shadow-md"
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg}`}>
                        <Bot size={18} className={config.color} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text)]">{agent.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {agent.status === "active" && (
                        <button
                          onClick={() => freezeMut.mutate({ id: agent.id, action: "freeze" })}
                          className="rounded-lg p-2 text-[var(--text-faint)] transition hover:bg-amber-500/10 hover:text-amber-400"
                          title="Freeze"
                        >
                          <ShieldOff size={15} />
                        </button>
                      )}
                      {agent.status === "frozen" && (
                        <button
                          onClick={() => freezeMut.mutate({ id: agent.id, action: "unfreeze" })}
                          className="rounded-lg p-2 text-[var(--text-faint)] transition hover:bg-emerald-500/10 hover:text-emerald-400"
                          title="Unfreeze"
                        >
                          <Shield size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {agent.description && (
                    <p className="mt-2 text-xs text-[var(--text-muted)] line-clamp-2">{agent.description}</p>
                  )}

                  {/* Wallet address */}
                  <div className="mt-3 flex items-center gap-2">
                    <Wallet size={12} className="text-[var(--text-faint)]" />
                    <code className="font-mono text-[11px] text-[var(--text-muted)]">
                      {truncateAddress(agent.public_key, 8, 6)}
                    </code>
                    <CopyButton text={agent.public_key} />
                  </div>

                  {/* Balance */}
                  {agent.balance && (
                    <div className="mt-3 flex items-center gap-4">
                      <div className="rounded-lg bg-[var(--surface-2)] px-3 py-1.5">
                        <span className="text-[10px] text-[var(--text-faint)]">USDC</span>
                        <p className="text-sm font-bold text-[var(--text)]">
                          {formatUsdc(agent.balance.usdc)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-2)] px-3 py-1.5">
                        <span className="text-[10px] text-[var(--text-faint)]">SOL</span>
                        <p className="text-sm font-bold text-[var(--text)]">
                          {agent.balance.sol.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Budget progress */}
                  {agent.total_funded_usdc > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-faint)]">
                        <span>Budget: {formatUsdc(agent.total_spent_usdc)} / {formatUsdc(agent.total_funded_usdc)}</span>
                        <span>{formatUsdc(remaining)} remaining</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--surface-3)]">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-all"
                          style={{ width: `${spentPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Limits */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-[var(--text-faint)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={10} />
                      {formatUsdc(agent.daily_limit_usdc)}/day
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <DollarSign size={10} />
                      {formatUsdc(agent.per_tx_limit_usdc)}/tx
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Activity size={10} />
                      {formatUsdc(agent.spent_today_usdc)} today
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-[var(--border)] px-5 py-3">
                  <Link
                    href={`/merchant/agents/${agent.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] transition hover:underline"
                  >
                    View Details & Activity
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
