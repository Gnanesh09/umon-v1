"use client";

import { type ReactNode } from "react";
import { Sidebar } from "@/components/organisms/Sidebar";
import { CommandPalette } from "@/components/molecules/CommandPalette";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardLayout({ children }: { children: ReactNode }): ReactNode {
  useAuth();

  return (
    <div className="grid h-full md:grid-cols-[240px_1fr]">
      <Sidebar />
      <main className="scroll-region h-full bg-gray-50 pb-16 text-gray-900 md:pb-0">{children}</main>
      <CommandPalette />
    </div>
  );
}
