import type { ReactNode } from "react";
import { Badge } from "../atoms/Badge";
import { CopyButton } from "../atoms/CopyButton";
import { truncateTxSignature, formatUsdc, timeAgo } from "@/lib/format";
import { explorerTxUrl } from "@/lib/constants";
import { ExternalLink } from "lucide-react";

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

const typeToStatus: Record<string, "active" | "released" | "disputed" | "cancelled" | "partially_released"> = {
  create: "active",
  release: "released",
  split: "released",
  oracle_trigger: "partially_released",
  milestone_approve: "partially_released",
  dispute_raise: "disputed",
  dispute_vote: "disputed",
  cancel: "cancelled",
};

export function TransactionRow({ tx }: { tx: Transaction }): ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--border)] px-4 py-3 text-sm last:border-b-0">
      <Badge status={typeToStatus[tx.tx_type] ?? "active"} />
      <span className="font-medium capitalize">{tx.tx_type.replace(/_/g, " ")}</span>
      {tx.amount_usdc ? (
        <span className="tabular-nums text-[var(--text-muted)]">{formatUsdc(tx.amount_usdc)}</span>
      ) : null}
      <span className="flex items-center gap-1 font-mono text-xs text-[var(--text-muted)]">
        {truncateTxSignature(tx.tx_signature)}
        <CopyButton text={tx.tx_signature} />
        <a
          href={explorerTxUrl(tx.tx_signature)}
          target="_blank"
          rel="noopener noreferrer"
          className="transition hover:text-[var(--primary)]"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </span>
      <span className="ml-auto text-xs text-[var(--text-faint)]">{timeAgo(tx.created_at)}</span>
    </div>
  );
}
