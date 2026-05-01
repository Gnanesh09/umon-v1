import type { ReactNode } from "react";
import { KPICardSkeleton } from "@/components/atoms/Skeleton";

export default function AnalyticsLoading(): ReactNode {
  return (
    <div className="p-6">
      <div className="mb-4 h-8 w-36 animate-pulse rounded bg-[var(--surface-3)]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
      </div>
      <div className="mt-6 card h-64 animate-pulse bg-[var(--surface-3)]" />
      <div className="mt-6 card h-48 animate-pulse bg-[var(--surface-3)]" />
    </div>
  );
}
