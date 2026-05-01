import type { ReactNode } from "react";
import { Skeleton } from "@/components/atoms/Skeleton";

export default function MerchantsLoading(): ReactNode {
  return (
    <div className="p-6">
      <div className="mb-4 h-8 w-36 animate-pulse rounded bg-[var(--surface-3)]" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="h-8 w-64 animate-pulse rounded-md bg-[var(--surface-3)]" />
        <div className="ml-auto h-8 w-28 animate-pulse rounded-md bg-[var(--surface-3)]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4">
            <Skeleton className="mb-3 h-5 w-40" />
            <Skeleton className="mb-2 h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
