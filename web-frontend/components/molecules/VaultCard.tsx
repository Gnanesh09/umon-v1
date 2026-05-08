import type { ReactNode } from "react";
import { formatUsdc } from "@/lib/format";
import { timeAgo, truncateAddress, conditionTypeLabel } from "@/lib/format";
import type { Vault, Condition } from "@/types/domain";
import {
  Clock,
  CheckCircle2,
  Split,
  Zap,
  ShoppingBag,
  Lock,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";

const CONDITION_ICON: Record<string, { icon: typeof Clock; bg: string; fg: string }> = {
  time_lock:  { icon: Clock,        bg: "rgba(59,130,246,0.12)", fg: "#60a5fa" },
  milestone:  { icon: CheckCircle2, bg: "rgba(16,185,129,0.12)", fg: "#34d399" },
  auto_split: { icon: Split,        bg: "rgba(139,92,246,0.12)", fg: "#a78bfa" },
  oracle:     { icon: Zap,          bg: "rgba(245,158,11,0.12)", fg: "#fbbf24" },
  category:   { icon: ShoppingBag,  bg: "rgba(244,63,94,0.12)",  fg: "#fb7185" },
};

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  active:              { dot: "bg-blue-400",    text: "text-blue-400",    label: "Active" },
  partially_released:  { dot: "bg-amber-400",   text: "text-amber-400",   label: "Partial" },
  released:            { dot: "bg-emerald-400",  text: "text-emerald-400", label: "Released" },
  disputed:            { dot: "bg-red-400",     text: "text-red-400",     label: "Disputed" },
  cancelled:           { dot: "bg-gray-500",    text: "text-gray-400",    label: "Cancelled" },
};

function getLeadCondition(conditions: Condition[]): { icon: typeof Clock; bg: string; fg: string } {
  if (!conditions || conditions.length === 0) return { icon: Lock, bg: "rgba(255,255,255,0.06)", fg: "#6b7280" };
  const first = conditions[0];
  return CONDITION_ICON[first.type] ?? { icon: Lock, bg: "rgba(255,255,255,0.06)", fg: "#6b7280" };
}

export function VaultCard({ vault }: { vault: Vault }): ReactNode {
  const progress = vault.amount_usdc > 0 ? (vault.released_amount_usdc / vault.amount_usdc) * 100 : 0;
  const lead = getLeadCondition(vault.conditions);
  const LeadIcon = lead.icon;
  const status = STATUS_STYLES[vault.status] ?? STATUS_STYLES.active;

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--border-strong)]"
    >
      {/* Top row: icon + action */}
      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: lead.bg }}
        >
          <LeadIcon className="h-5 w-5" style={{ color: lead.fg }} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-2.5 py-1">
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            <span className={`text-[10px] font-semibold ${status.text}`}>{status.label}</span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-faint)] transition group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]">
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-bold leading-snug text-[var(--text)]">
        {vault.description || "Untitled Vault"}
      </h3>

      {/* Amount + time */}
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-lg font-extrabold tabular-nums text-[var(--text)]">
          {formatUsdc(vault.amount_usdc)}
        </span>
        <span className="text-[11px] text-[var(--text-faint)]">
          {timeAgo(vault.created_at)}
        </span>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">Released</span>
          <span className="text-[11px] font-bold tabular-nums text-[var(--text-muted)]">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: progress >= 100
                ? "linear-gradient(90deg, #059669, #10b981)"
                : "linear-gradient(90deg, #7c5cfc, #a78bfa)",
            }}
          />
        </div>
      </div>

      {/* Condition tags */}
      {vault.conditions && vault.conditions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {vault.conditions.slice(0, 3).map((c, i) => {
            const ci = CONDITION_ICON[c.type];
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: ci?.bg ?? "rgba(255,255,255,0.06)", color: ci?.fg ?? "#9ca3af" }}
              >
                {conditionTypeLabel(c.type)}
                {"percentage" in c && <span className="opacity-70">{c.percentage}%</span>}
              </span>
            );
          })}
          {vault.conditions.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              +{vault.conditions.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Wallets */}
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--text-faint)]">
        <span className="font-mono">{truncateAddress(vault.creator_wallet, 4, 4)}</span>
        <ArrowUpRight className="h-3 w-3" />
        <span className="font-mono">{truncateAddress(vault.recipient_wallet, 4, 4)}</span>
      </div>

      {/* CTA button */}
      <div className="mt-4 pt-1">
        <span className="inline-flex h-9 w-full items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--text-muted)] transition group-hover:border-[var(--primary)]/30 group-hover:bg-[var(--primary)]/[0.06] group-hover:text-[var(--primary)]">
          View Details
        </span>
      </div>
    </div>
  );
}
