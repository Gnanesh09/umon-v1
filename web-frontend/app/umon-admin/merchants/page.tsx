"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi as api, type ApiResult } from "@/lib/adminApi";
import { truncateAddress } from "@/lib/format";
import { Search, CheckCircle2, XCircle, Ban, ExternalLink, Globe, Clock } from "lucide-react";
import { toast } from "sonner";

type Merchant = {
  id: string;
  merchant_id: string;
  wallet_address: string;
  business_name: string;
  business_type: string | null;
  category: string;
  description: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-700",
};

const TABS = ["pending", "approved", "rejected", "suspended", "all"];

export default function AdminMerchantsPage(): ReactNode {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const merchantsQuery = useQuery({
    queryKey: ["admin-merchants", tab, search],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "100" };
      if (tab !== "all") params.status = tab;
      if (search) params.search = search;
      const res = await api.get<ApiResult<Merchant[]>>("/merchants", { params });
      return res.data.data;
    },
  });

  const approveMut = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/merchants/${id}/approve`);
    },
    onSuccess: () => {
      toast.success("Merchant approved");
      queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
    },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectMut = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.put(`/merchants/${id}/reject`, { reason });
    },
    onSuccess: () => {
      toast.success("Merchant rejected");
      setRejectId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
    },
    onError: () => toast.error("Failed to reject"),
  });

  const suspendMut = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/merchants/${id}/suspend`, { reason: "Suspended by admin" });
    },
    onSuccess: () => {
      toast.success("Merchant suspended");
      queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
    },
    onError: () => toast.error("Failed to suspend"),
  });

  const merchants = merchantsQuery.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Merchant Management</h1>
        <p className="text-sm text-gray-500">Review applications, approve or reject merchants</p>
      </div>

      {/* Tabs + Search */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition ${
                tab === t ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, or wallet..."
            className="h-9 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500">Merchant</th>
              <th className="px-4 py-3 font-medium text-gray-500">ID</th>
              <th className="px-4 py-3 font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 font-medium text-gray-500">Location</th>
              <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500">Applied</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {merchantsQuery.isLoading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : merchants.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No merchants found</td></tr>
            ) : merchants.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{m.business_name}</div>
                  <div className="text-xs text-gray-400 font-mono">{truncateAddress(m.wallet_address)}</div>
                  {m.contact_email ? <div className="text-xs text-gray-400">{m.contact_email}</div> : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.merchant_id}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{m.category}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {m.country ? (
                    <span className="flex items-center gap-1 text-xs">
                      <Globe className="h-3 w-3" /> {m.city ? `${m.city}, ` : ""}{m.country}
                    </span>
                  ) : <span className="text-xs text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status] ?? STATUS_STYLES.pending}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {m.status === "pending" && (
                      <>
                        <button
                          onClick={() => approveMut.mutate(m.id)}
                          disabled={approveMut.isPending}
                          className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition"
                          title="Approve"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setRejectId(m.id)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 transition"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {m.status === "approved" && (
                      <button
                        onClick={() => suspendMut.mutate(m.id)}
                        disabled={suspendMut.isPending}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition"
                        title="Suspend"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                    {m.website ? (
                      <a
                        href={m.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Reject Merchant</h3>
            <p className="mt-1 text-sm text-gray-500">Provide a reason for rejection (optional).</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-900 outline-none focus:border-indigo-500"
              rows={3}
              placeholder="Reason..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setRejectId(null); setRejectReason(""); }}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectMut.mutate({ id: rejectId, reason: rejectReason })}
                disabled={rejectMut.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
