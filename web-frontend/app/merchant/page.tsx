"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Store, PlusCircle, CreditCard, Clock, CheckCircle2, XCircle, Inbox } from "lucide-react";

type MerchantBusiness = {
  id: string;
  merchant_id: string;
  business_name: string;
  category: string;
  status: string;
  created_at: string;
};

type ClaimableVault = { id: string; amount_usdc: number; conditions: Array<{ type: string; percentage?: number }> };

const STATUS_ICON: Record<string, ReactNode> = {
  approved: <CheckCircle2 size={16} className="text-emerald-500" />,
  pending: <Clock size={16} className="text-amber-500" />,
  rejected: <XCircle size={16} className="text-red-500" />,
  suspended: <XCircle size={16} className="text-gray-400" />,
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

  const businesses = businessesQuery.data ?? [];
  const claimable = claimableQuery.data ?? [];
  const approved = businesses.filter((b) => b.status === "approved").length;
  const pending = businesses.filter((b) => b.status === "pending").length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-cabinet text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your businesses and track payments from the merchant dashboard.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total Businesses</p>
            <Store size={18} className="text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{businesses.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Active</p>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{approved}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Pending</p>
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{pending}</p>
        </div>
      </div>

      {/* Claimable Alert */}
      {claimable.length > 0 && (
        <div className="mb-6">
          <Link
            href="/merchant/payments"
            className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition hover:border-emerald-300 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Inbox size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-emerald-800">
                {claimable.length} vault{claimable.length !== 1 ? "s" : ""} ready to claim
              </p>
              <p className="text-xs text-emerald-600">
                Category-restricted funds are waiting for you. Click to claim.
              </p>
            </div>
            <span className="text-sm font-medium text-emerald-700">&rarr;</span>
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/merchant/register"
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <PlusCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Register New Business</p>
              <p className="text-xs text-gray-500">Add another business to your account</p>
            </div>
          </Link>
          <Link
            href="/merchant/payments"
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <CreditCard size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">View Payments</p>
              <p className="text-xs text-gray-500">Track incoming payments across businesses</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Businesses List */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Your Businesses</h2>
          <Link href="/merchant/businesses" className="text-xs font-medium text-emerald-600 hover:underline">
            View All
          </Link>
        </div>

        {businessesQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Store size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-900">No businesses yet</p>
            <p className="mt-1 text-sm text-gray-500">Register your first business to start accepting payments.</p>
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
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <Store size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{biz.business_name}</p>
                    <p className="text-xs text-gray-400">{biz.merchant_id} &middot; {biz.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {STATUS_ICON[biz.status]}
                  <span className="text-xs text-gray-500">{STATUS_LABEL[biz.status] ?? biz.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
