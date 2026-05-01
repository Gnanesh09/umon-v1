"use client";

import { ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, BarChart3, Settings, Store, LayoutDashboard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import type { Vault } from "@/types/domain";
import { useUiStore } from "@/store/uiStore";
import { truncateAddress } from "@/lib/format";

type QuickAction = {
  label: string;
  href: string;
  icon: typeof Plus;
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Create Payment", href: "/dashboard/create", icon: Plus },
  { label: "View Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "View Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Merchants", href: "/dashboard/merchants", icon: Store },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function CommandPalette(): ReactNode {
  const router = useRouter();
  const { commandOpen, setCommandOpen } = useUiStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const vaultsQuery = useQuery({
    queryKey: ["command-palette-vaults", query],
    queryFn: async () => {
      if (query.length < 2) return { data: [] };
      const res = await api.get<ApiResult<Vault[]>>("/vaults", {
        params: { limit: "5" },
      });
      return res.data;
    },
    enabled: commandOpen && query.length >= 2,
    staleTime: 5000,
  });

  const matchedVaults = (vaultsQuery.data?.data ?? []).filter(
    (v) =>
      v.description?.toLowerCase().includes(query.toLowerCase()) ||
      v.on_chain_id?.toLowerCase().includes(query.toLowerCase()),
  );

  const matchedActions = QUICK_ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()),
  );

  const allItems = [
    ...matchedActions.map((a) => ({ type: "action" as const, ...a })),
    ...matchedVaults.map((v) => ({ type: "vault" as const, ...v })),
  ];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (index: number) => {
      const item = allItems[index];
      if (!item) return;
      if (item.type === "action") {
        router.push(item.href);
      } else {
        router.push(`/dashboard/vaults/${item.id}`);
      }
      setCommandOpen(false);
      setQuery("");
    },
    [allItems, router, setCommandOpen],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (e.key === "Escape") {
        setCommandOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandOpen, setCommandOpen]);

  useEffect(() => {
    if (commandOpen) inputRef.current?.focus();
  }, [commandOpen]);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  return (
    <AnimatePresence>
      {commandOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setCommandOpen(false); setQuery(""); }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
              <Search className="h-5 w-5 text-[var(--text-muted)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search vaults, actions..."
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-faint)]"
              />
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--text-faint)]">
                ESC
              </kbd>
            </div>
            <div className="max-h-72 overflow-y-auto overscroll-contain p-2">
              {allItems.length === 0 ? (
                <p className="p-4 text-center text-xs text-[var(--text-muted)]">
                  {query.length > 0 ? "No results found" : "Type to search..."}
                </p>
              ) : (
                allItems.map((item, i) => (
                  <button
                    key={item.type === "action" ? item.label : item.id}
                    onClick={() => handleSelect(i)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${
                      i === selectedIndex
                        ? "bg-[var(--primary-subtle)] text-[var(--text)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    {item.type === "action" ? (
                      <>
                        <item.icon className="h-4 w-4 text-[var(--primary)]" />
                        <span>{item.label}</span>
                      </>
                    ) : (
                      <>
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--surface-3)] text-xs font-medium">
                          V
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.description || "Untitled"}</p>
                          <p className="truncate text-xs text-[var(--text-faint)]">
                            {truncateAddress(item.on_chain_id)}
                          </p>
                        </div>
                      </>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
