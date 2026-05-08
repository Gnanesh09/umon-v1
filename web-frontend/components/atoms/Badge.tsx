import type { ReactNode } from "react";
import clsx from "clsx";

type Props = {
  status: "active" | "partially_released" | "released" | "disputed" | "cancelled";
};

const map = {
  active: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  partially_released: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  released: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  disputed: "bg-red-500/15 text-red-400 border-red-500/20",
  cancelled: "bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)]",
};

export function Badge({ status }: Props): ReactNode {
  return (
    <span className={clsx("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize", map[status])}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
