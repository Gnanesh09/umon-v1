import type { ReactNode } from "react";
import { Skeleton } from "@/components/atoms/Skeleton";

export default function CreateLoading(): ReactNode {
  return (
    <div className="p-6">
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-[var(--surface-3)]" />
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--surface-3)]" />
              {s < 4 ? <div className="h-0.5 flex-1 rounded bg-[var(--surface-3)]" /> : null}
            </div>
          ))}
        </div>
        <div className="card p-6">
          <Skeleton className="mb-4 h-6 w-32" />
          <div className="grid gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
