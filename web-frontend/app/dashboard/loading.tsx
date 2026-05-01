import type { ReactNode } from "react";
import { KPICardSkeleton, VaultCardSkeleton, TableRowSkeleton } from "@/components/atoms/Skeleton";

export default function DashboardLoading(): ReactNode {
  return (
    <div className="p-6">
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-[var(--surface-3)]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <VaultCardSkeleton key={i} />)}
      </div>
      <div className="mt-6 card overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} />)}
      </div>
    </div>
  );
}
