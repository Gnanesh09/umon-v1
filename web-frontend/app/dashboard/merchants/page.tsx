"use client";

import { ReactNode, useState } from "react";
import { Header } from "@/components/organisms/Header";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { Badge } from "@/components/atoms/Badge";
import { CopyButton } from "@/components/atoms/CopyButton";
import { Skeleton } from "@/components/atoms/Skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { truncateAddress } from "@/lib/format";
import { MERCHANT_CATEGORIES } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X, CheckCircle2, Globe } from "lucide-react";

type Merchant = {
  id: string;
  wallet_address: string;
  business_name: string;
  category: string;
  country: string | null;
  verified: boolean;
  created_at: string;
};

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  ...MERCHANT_CATEGORIES.map((c) => ({ value: c, label: c })),
];

export default function MerchantsPage(): ReactNode {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [formData, setFormData] = useState({ walletAddress: "", businessName: "", category: "Medical", country: "" });

  const merchantsQuery = useQuery({
    queryKey: ["merchants", category, search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (search) params.search = search;
      const res = await api.get<ApiResult<Merchant[]>>("/merchants", { params });
      return res.data;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/merchants", formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      setShowRegister(false);
      setFormData({ walletAddress: "", businessName: "", category: "Medical", country: "" });
    },
  });

  const merchants = merchantsQuery.data?.data ?? [];

  return (
    <div className="min-h-full">
      <Header title="Merchants" />
      <div className="p-6">
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
          <Button size="sm" className="ml-auto" onClick={() => setShowRegister(!showRegister)}>
            <Plus className="h-4 w-4" /> Register
          </Button>
        </div>

        {/* Register Panel */}
        <AnimatePresence>
          {showRegister ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Register Merchant</h3>
                  <button onClick={() => setShowRegister(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Business Name"
                    value={formData.businessName}
                    onChange={(e) => setFormData((p) => ({ ...p, businessName: e.target.value }))}
                  />
                  <Input
                    label="Wallet Address"
                    value={formData.walletAddress}
                    onChange={(e) => setFormData((p) => ({ ...p, walletAddress: e.target.value }))}
                  />
                  <Select
                    label="Category"
                    value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                    options={MERCHANT_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  />
                  <Input
                    label="Country"
                    value={formData.country}
                    onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                  />
                </div>
                <Button
                  size="sm"
                  className="mt-3"
                  loading={registerMutation.isPending}
                  onClick={() => registerMutation.mutate()}
                  disabled={!formData.businessName || !formData.walletAddress}
                >
                  Register
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

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
            <p className="text-[var(--text-muted)]">No merchants found</p>
            <p className="mt-1 text-xs text-[var(--text-faint)]">Register a merchant to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {merchants.map((merchant, i) => (
              <motion.div
                key={merchant.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card p-4 transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{merchant.business_name}</h3>
                    <div className="mt-1 flex items-center gap-1 text-xs font-mono text-[var(--text-muted)]">
                      {truncateAddress(merchant.wallet_address)}
                      <CopyButton text={merchant.wallet_address} />
                    </div>
                  </div>
                  {merchant.verified ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                  ) : null}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-xs">
                    {merchant.category}
                  </span>
                  {merchant.country ? (
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Globe className="h-3 w-3" /> {merchant.country}
                    </span>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
