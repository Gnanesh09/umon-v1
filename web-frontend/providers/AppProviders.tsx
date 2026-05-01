"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { SolanaProvider } from "./SolanaProvider";

type Props = { children: ReactNode };

export function AppProviders({ children }: Props): ReactNode {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProvider>
        {children}
        <Toaster position="top-right" richColors duration={4000} />
      </SolanaProvider>
    </QueryClientProvider>
  );
}