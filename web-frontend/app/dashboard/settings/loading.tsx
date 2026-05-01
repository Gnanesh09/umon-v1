import type { ReactNode } from "react";
import { Skeleton } from "@/components/atoms/Skeleton";

export default function SettingsLoading(): ReactNode {
  return (
    <div className="p-6">
      <div className="mb-4 h-8 w-32 animate-pulse rounded bg-[var(--surface-3)]" />
      <div className="mx-auto max-w-2xl space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5">
            <Skeleton className="mb-4 h-5 w-24" />
            <div className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
