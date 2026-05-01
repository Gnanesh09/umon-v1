"use client";
import type { ReactNode } from "react";

import { ArrowUpRight } from "lucide-react";

type Props = {
  title: string;
  value: string;
  delta: string;
};

export function KPICard({ title, value, delta }: Props): ReactNode {
  return (
    <div className="card p-4">
      <p className="text-xs text-[var(--text-muted)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-2 flex items-center gap-1 text-xs text-[var(--success)]"><ArrowUpRight className="h-3.5 w-3.5" />{delta}</p>
    </div>
  );
}