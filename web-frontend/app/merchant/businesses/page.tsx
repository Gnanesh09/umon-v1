"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { truncateAddress } from "@/lib/format";
import { CopyButton } from "@/components/atoms/CopyButton";
import Link from "next/link";
import { toast } from "sonner";
import {
  Store,
  PlusCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Globe,
  Mail,
  Phone,
  Edit3,
  X,
  Save,
  ExternalLink,
} from "lucide-react";

type Business = {
  id: string;
  merchant_id: string;
  wallet_address: string;
  business_wallet: string;
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
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  rejected: "bg-red-500/10 text-red-700 border-red-200",
  suspended: "bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)]",
};

const STATUS_ICON: Record<string, ReactNode> = {
  approved: <CheckCircle2 size={14} className="text-emerald-500" />,
  pending: <Clock size={14} className="text-amber-500" />,
  rejected: <XCircle size={14} className="text-red-400" />,
  suspended: <XCircle size={14} className="text-[var(--text-faint)]" />,
};

export default function BusinessesPage(): ReactNode {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const businessesQuery = useQuery({
    queryKey: ["merchant-businesses"],
    queryFn: async () => {
      const res = await api.get<ApiResult<Business[]>>("/merchants/me/all");
      return res.data.data;
    },
    enabled: !!user,
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string> }) => {
      await api.put(`/merchants/${id}`, data);
    },
    onSuccess: () => {
      toast.success("Business updated");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["merchant-businesses"] });
    },
    onError: () => toast.error("Failed to update"),
  });

  const businesses = businessesQuery.data ?? [];

  const startEdit = (biz: Business) => {
    setEditingId(biz.id);
    setEditForm({
      businessName: biz.business_name,
      businessWallet: biz.business_wallet ?? "",
      description: biz.description ?? "",
      country: biz.country ?? "",
      city: biz.city ?? "",
      website: biz.website ?? "",
      contactEmail: biz.contact_email ?? "",
      contactPhone: biz.contact_phone ?? "",
    });
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-cabinet text-2xl font-bold text-[var(--text)]">My Businesses</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{businesses.length} registered business{businesses.length !== 1 ? "es" : ""}</p>
        </div>
        <Link
          href="/merchant/register"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          <PlusCircle size={16} /> Register New
        </Link>
      </div>

      {businessesQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-3)]" />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-16 text-center">
          <Store size={48} className="mx-auto mb-4 text-[var(--text-faint)]" />
          <p className="text-lg font-medium text-[var(--text)]">No businesses registered</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Get started by registering your first business.</p>
          <Link
            href="/merchant/register"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            <PlusCircle size={16} /> Register Business
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {businesses.map((biz) => (
            <div key={biz.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:shadow-sm">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--surface-3)]">
                    <Store size={20} className="text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-[var(--text)]">{biz.business_name}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[biz.status] ?? ""}`}>
                        {STATUS_ICON[biz.status]} {biz.status}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--text-faint)]">
                      <span className="font-mono">{biz.merchant_id}</span>
                      <span>{biz.category}</span>
                      <span>Registered {new Date(biz.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {biz.status === "approved" && editingId !== biz.id && (
                  <button
                    onClick={() => startEdit(biz)}
                    className="rounded-lg p-2 text-[var(--text-faint)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text-muted)]"
                  >
                    <Edit3 size={16} />
                  </button>
                )}
              </div>

              {/* Rejection reason */}
              {biz.status === "rejected" && biz.rejection_reason && (
                <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  Reason: {biz.rejection_reason}
                </div>
              )}

              {/* Details */}
              {editingId === biz.id ? (
                <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Business Payment Wallet</label>
                    <input
                      value={editForm.businessWallet}
                      onChange={(e) => setEditForm((f) => ({ ...f, businessWallet: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-[var(--border)] px-3 font-mono text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Business Name</label>
                      <input
                        value={editForm.businessName}
                        onChange={(e) => setEditForm((f) => ({ ...f, businessName: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Email</label>
                      <input
                        value={editForm.contactEmail}
                        onChange={(e) => setEditForm((f) => ({ ...f, contactEmail: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Country</label>
                      <input
                        value={editForm.country}
                        onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">City</label>
                      <input
                        value={editForm.city}
                        onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Website</label>
                      <input
                        value={editForm.website}
                        onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Phone</label>
                      <input
                        value={editForm.contactPhone}
                        onChange={(e) => setEditForm((f) => ({ ...f, contactPhone: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-[var(--border)] p-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateMut.mutate({ id: biz.id, data: editForm })}
                      disabled={updateMut.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                    >
                      <Save size={14} /> Save Changes
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 border-t border-[var(--border)] pt-4">
                  {biz.business_wallet && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2">
                      <span className="text-xs font-medium text-[var(--text-faint)]">Payment Wallet:</span>
                      <code className="text-xs text-[var(--text)]">{biz.business_wallet}</code>
                      <CopyButton text={biz.business_wallet} />
                    </div>
                  )}
                  {biz.description && (
                    <p className="mb-3 text-sm text-[var(--text-muted)]">{biz.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                    {biz.country && (
                      <span className="flex items-center gap-1">
                        <Globe size={12} /> {biz.city ? `${biz.city}, ` : ""}{biz.country}
                      </span>
                    )}
                    {biz.contact_email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {biz.contact_email}
                      </span>
                    )}
                    {biz.contact_phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {biz.contact_phone}
                      </span>
                    )}
                    {biz.website && (
                      <a href={biz.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-400 hover:underline">
                        <ExternalLink size={12} /> Website
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
