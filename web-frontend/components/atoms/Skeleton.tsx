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
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-5 w-3/4" />
      <div className="mt-2 flex gap-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-12 self-end" />
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <div className="mt-3 flex gap-1.5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-3 w-32" />
      <Skeleton className="mt-4 h-9 w-full rounded-full" />
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
