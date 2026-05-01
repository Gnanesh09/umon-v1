import type { ReactNode } from "react";
import { VaultCardSkeleton } from "@/components/atoms/Skeleton";

export default function VaultsLoading(): ReactNode {
  return (
    <div className="p-6">
      <div className="mb-4 h-8 w-32 animate-pulse rounded bg-[var(--surface-3)]" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="h-8 w-64 animate-pulse rounded-md bg-[var(--surface-3)]" />
        <div className="ml-auto h-8 w-36 animate-pulse rounded-md bg-[var(--surface-3)]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <VaultCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
