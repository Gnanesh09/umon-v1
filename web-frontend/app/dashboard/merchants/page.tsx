"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { Header } from "@/components/organisms/Header";
import { truncateAddress } from "@/lib/format";
import { CopyButton } from "@/components/atoms/CopyButton";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Store, Globe, ShieldCheck, Search } from "lucide-react";
import { useState } from "react";
import { MERCHANT_CATEGORIES } from "@/lib/constants";

type Merchant = {
  id: string;
  merchant_id: string;
  wallet_address: string;
  business_name: string;
  category: string;
  description: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  status: string;
  created_at: string;
};

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  ...MERCHANT_CATEGORIES.map((c) => ({ value: c, label: c })),
];

export default function MerchantsPage(): ReactNode {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const merchantsQuery = useQuery({
    queryKey: ["merchants", category, search],
    queryFn: async () => {
      const params: Record<string, string> = { status: "approved" };
      if (category) params.category = category;
      if (search) params.search = search;
      const res = await api.get<ApiResult<Merchant[]>>("/merchants", { params });
      return res.data;
    },
  });

  const merchants = merchantsQuery.data?.data ?? [];

  return (
    <div className="min-h-full">
      <Header title="Merchants" />
      <div className="p-6">
        {/* Info Banner */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4">
          <Store size={20} className="text-indigo-400" />
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Want to become a merchant?</p>
            <p className="text-xs text-indigo-400">
              <Link href="/merchant" className="underline hover:no-underline">Visit the Merchant Portal</Link> to register your business and start accepting payments.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCategory(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  category === opt.value
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchants..."
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-xs text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Merchant Cards */}
        {merchantsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4">
                <Skeleton className="mb-3 h-5 w-40" />
                <Skeleton className="mb-2 h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : merchants.length === 0 ? (
          <div className="grid place-items-center py-20 text-center">
            <Store className="mb-3 h-10 w-10 text-[var(--text-faint)]" />
            <p className="text-[var(--text-muted)]">No merchants found</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {merchants.map((merchant) => (
              <div
                key={merchant.id}
                className="card p-4 transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{merchant.business_name}</h3>
                      <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
                    </div>
                    <span className="font-mono text-[10px] text-[var(--text-faint)]">{merchant.merchant_id}</span>
                    <div className="mt-1 flex items-center gap-1 text-xs font-mono text-[var(--text-muted)]">
                      {truncateAddress(merchant.wallet_address)}
                      <CopyButton text={merchant.wallet_address} />
                    </div>
                  </div>
                </div>
                {merchant.description ? (
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--text-muted)]">{merchant.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-xs">{merchant.category}</span>
                  {merchant.country ? (
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Globe className="h-3 w-3" /> {merchant.country}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
