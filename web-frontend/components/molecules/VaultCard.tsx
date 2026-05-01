import type { ReactNode } from "react";
import { Badge } from "../atoms/Badge";
import { formatUsdc } from "@/lib/format";
import type { Vault } from "@/types/domain";

export function VaultCard({ vault }: { vault: Vault }): ReactNode {
  const progress = vault.amount_usdc > 0 ? (vault.released_amount_usdc / vault.amount_usdc) * 100 : 0;
  return (
    <div className="card p-4 transition hover:-translate-y-1 hover:shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">{vault.description ?? "Untitled vault"}</h3>
        <Badge status={vault.status} />
      </div>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{formatUsdc(vault.amount_usdc)}</p>
      <div className="mt-3 h-2 rounded-full bg-[var(--surface-3)]">
        <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">{progress.toFixed(2)}% released</p>
    </div>
  );
}