"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Store, PlusCircle, CreditCard, Clock, CheckCircle2, XCircle, Inbox, TrendingUp, Link2 } from "lucide-react";

type MerchantBusiness = {
  id: string;
  merchant_id: string;
  business_name: string;
  category: string;
  status: string;
  created_at: string;
};

type ClaimableVault = { id: string; amount_usdc: number; conditions: Array<{ type: string; percentage?: number }> };

type CollectionsTotals = {
  totalCollected: number;
  totalSessions: number;
  completedSessions: number;
};

const STATUS_ICON: Record<string, ReactNode> = {
  approved: <CheckCircle2 size={16} className="text-emerald-500" />,
  pending: <Clock size={16} className="text-amber-500" />,
  rejected: <XCircle size={16} className="text-red-400" />,
  suspended: <XCircle size={16} className="text-[var(--text-faint)]" />,
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Active",
  pending: "Pending Review",
  rejected: "Rejected",
  suspended: "Suspended",
};

export default function MerchantOverview(): ReactNode {
  const { user } = useAuthStore();

  const businessesQuery = useQuery({
    queryKey: ["merchant-businesses"],
    queryFn: async () => {
      const res = await api.get<ApiResult<MerchantBusiness[]>>("/merchants/me/all");
      return res.data.data;
    },
    enabled: !!user,
  });

  const claimableQuery = useQuery({
    queryKey: ["claimable-vaults"],
    queryFn: async () => {
      const res = await api.get<ApiResult<ClaimableVault[]>>("/vaults/claimable");
      return res.data.data;
    },
    enabled: !!user,
  });

  const collectionsQuery = useQuery({
    queryKey: ["payment-link-collections"],
    queryFn: async () => {
      const res = await api.get<ApiResult<{ totals: CollectionsTotals }>>("/payment-links/collections");
      return res.data.data.totals;
    },
    enabled: !!user,
  });

  const businesses = businessesQuery.data ?? [];
  const claimable = claimableQuery.data ?? [];
  const totals = collectionsQuery.data;
  const approved = businesses.filter((b) => b.status === "approved").length;
  const pending = businesses.filter((b) => b.status === "pending").length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-cabinet text-2xl font-bold text-[var(--text)]">Welcome back</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage your businesses and track payments from the merchant dashboard.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-emerald-400">Funds Collected</p>
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            ${totals ? (totals.totalCollected / 1_000_000).toFixed(2) : "0.00"}
          </p>
          {totals && totals.completedSessions > 0 && (
            <p className="mt-1 text-xs text-emerald-400/70">{totals.completedSessions} payments via links</p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">Total Businesses</p>
            <Store size={18} className="text-[var(--text-faint)]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--text)]">{businesses.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">Active</p>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--text)]">{approved}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">Pending</p>
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--text)]">{pending}</p>
        </div>
      </div>

      {/* Claimable Alert */}
      {claimable.length > 0 && (
        <div className="mb-6">
          <Link
            href="/merchant/payments"
            className="flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 transition hover:border-emerald-300 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
              <Inbox size={20} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-emerald-800">
                {claimable.length} vault{claimable.length !== 1 ? "s" : ""} ready to claim
              </p>
              <p className="text-xs text-emerald-400">
                Category-restricted funds are waiting for you. Click to claim.
              </p>
            </div>
            <span className="text-sm font-medium text-emerald-400">&rarr;</span>
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/merchant/register"
            className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-emerald-500/20 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <PlusCircle size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-[var(--text)]">Register New Business</p>
              <p className="text-xs text-[var(--text-muted)]">Add another business to your account</p>
            </div>
          </Link>
          <Link
            href="/merchant/payments"
            className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-indigo-500/20 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
              <CreditCard size={20} className="text-indigo-400" />
            </div>
            <div>
              <p className="font-medium text-[var(--text)]">View Payments</p>
              <p className="text-xs text-[var(--text-muted)]">Track incoming payments across businesses</p>
            </div>
          </Link>
          <Link
            href="/merchant/payment-links"
            className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-emerald-500/20 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Link2 size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-[var(--text)]">Payment Links & Collections</p>
              <p className="text-xs text-[var(--text-muted)]">View funds collected from your payment links</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Businesses List */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text)]">Your Businesses</h2>
          <Link href="/merchant/businesses" className="text-xs font-medium text-emerald-400 hover:underline">
            View All
          </Link>
        </div>

        {businessesQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-3)]" />
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-12 text-center">
            <Store size={40} className="mx-auto mb-3 text-[var(--text-faint)]" />
            <p className="font-medium text-[var(--text)]">No businesses yet</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Register your first business to start accepting payments.</p>
            <Link
              href="/merchant/register"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <PlusCircle size={16} /> Register Business
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {businesses.slice(0, 5).map((biz) => (
              <Link
                key={biz.id}
                href="/merchant/businesses"
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--border-strong)] hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-3)]">
                    <Store size={18} className="text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text)]">{biz.business_name}</p>
                    <p className="text-xs text-[var(--text-faint)]">{biz.merchant_id} &middot; {biz.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {STATUS_ICON[biz.status]}
                  <span className="text-xs text-[var(--text-muted)]">{STATUS_LABEL[biz.status] ?? biz.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
