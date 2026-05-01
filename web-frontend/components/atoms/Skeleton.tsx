import type { ReactNode } from "react";
import clsx from "clsx";

type Props = { className?: string; variant?: "text" | "card" | "circle" };

export function Skeleton({ className, variant = "text" }: Props): ReactNode {
  const base = "animate-pulse rounded bg-[var(--surface-3)]";
  const variants = {
    text: "h-4 w-full",
    card: "h-40 w-full rounded-[var(--radius-lg)]",
    circle: "h-10 w-10 rounded-full",
  };
  return <div className={clsx(base, variants[variant], className)} />;
}

export function KPICardSkeleton(): ReactNode {
  return (
    <div className="card p-4">
      <Skeleton className="mb-3 h-3 w-20" />
      <Skeleton className="mb-3 h-7 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function VaultCardSkeleton(): ReactNode {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-4 w-24" />
      <Skeleton className="mt-3 h-2 w-full rounded-full" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

export function TableRowSkeleton(): ReactNode {
  return (
    <div className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-3">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-12" />
    </div>
  );
}
