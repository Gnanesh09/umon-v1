import type { ReactNode } from "react";
import { VaultCardSkeleton, TableRowSkeleton } from "@/components/atoms/Skeleton";

export default function VaultDetailLoading(): ReactNode {
  return (
    <div className="p-6">
      <div className="mb-4 h-8 w-40 animate-pulse rounded bg-[var(--surface-3)]" />
      <div className="mx-auto max-w-4xl space-y-4">
        <VaultCardSkeleton />
        <VaultCardSkeleton />
        <div className="card overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
