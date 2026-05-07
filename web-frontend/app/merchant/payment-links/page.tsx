"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { QRCodeDisplay } from "@/components/molecules/QRCodeDisplay";
import { toast } from "sonner";
import {
  Link2,
  Plus,
  Copy,
  Check,
  Trash2,
  QrCode,
  ExternalLink,
  Loader2,
  X,
  LinkIcon,
} from "lucide-react";

type PaymentLink = {
  id: string;
  short_code: string;
  owner_type: string;
  recipient_wallet: string;
  amount_usdc: number | null;
  title: string;
  description: string | null;
  use_count: number;
  max_uses: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  paymentUrl?: string;
};

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

export default function PaymentLinksPage(): ReactNode {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [qrLink, setQrLink] = useState<PaymentLink | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    amountUsdc: "",
    recipientWallet: "",
    maxUses: "",
  });

  const linksQuery = useQuery({
    queryKey: ["payment-links"],
    queryFn: async () => {
      const res = await api.get<ApiResult<PaymentLink[]>>("/payment-links");
      return res.data.data;
    },
    enabled: !!user,
  });

  const createMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post("/payment-links", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Payment link created!");
      queryClient.invalidateQueries({ queryKey: ["payment-links"] });
      setShowCreate(false);
      setForm({ title: "", description: "", amountUsdc: "", recipientWallet: "", maxUses: "" });
    },
    onError: () => toast.error("Failed to create payment link"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payment-links/${id}`);
    },
    onSuccess: () => {
      toast.success("Payment link deactivated");
      queryClient.invalidateQueries({ queryKey: ["payment-links"] });
    },
  });

  const handleCreate = () => {
    createMut.mutate({
      title: form.title,
      description: form.description || undefined,
      recipientWallet: form.recipientWallet || user?.walletAddress,
      amountUsdc: form.amountUsdc ? Number(form.amountUsdc) * 1_000_000 : undefined,
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      ownerType: "merchant",
    });
  };

  const copyUrl = (link: PaymentLink) => {
    const url = `${FRONTEND_URL}/pay/${link.short_code}`;
    navigator.clipboard.writeText(url);
    setCopied(link.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const links = linksQuery.data ?? [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-cabinet text-2xl font-bold text-gray-900">Payment Links</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage payment links for your business.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          <Plus size={16} />
          Create Link
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">New Payment Link</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Coffee Payment"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Amount (USDC) — leave blank for flexible</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amountUsdc}
                  onChange={(e) => setForm((p) => ({ ...p, amountUsdc: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="10.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Recipient Wallet (defaults to yours)</label>
                <input
                  value={form.recipientWallet}
                  onChange={(e) => setForm((p) => ({ ...p, recipientWallet: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder={user?.walletAddress ?? ""}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Max Uses (leave blank for unlimited)</label>
                <input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="100"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={!form.title || createMut.isPending}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {createMut.isPending ? "Creating..." : "Create Payment Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">QR Code</h2>
              <button onClick={() => setQrLink(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <QRCodeDisplay
              url={`${FRONTEND_URL}/pay/${qrLink.short_code}`}
              title={qrLink.title}
              size={220}
            />
          </div>
        </div>
      )}

      {/* Links List */}
      {linksQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <LinkIcon size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No payment links yet</p>
          <p className="mt-1 text-xs text-gray-400">Create one to start accepting payments.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => {
            const url = `${FRONTEND_URL}/pay/${link.short_code}`;
            return (
              <div
                key={link.id}
                className={`rounded-xl border bg-white p-5 transition hover:shadow-sm ${
                  link.is_active ? "border-gray-200" : "border-gray-100 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link2 size={16} className="text-emerald-600" />
                      <h3 className="text-sm font-semibold text-gray-900">{link.title}</h3>
                      {!link.is_active && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    {link.description && (
                      <p className="mt-1 text-xs text-gray-500">{link.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span>
                        Amount: {link.amount_usdc ? `$${(link.amount_usdc / 1_000_000).toFixed(2)}` : "Flexible"}
                      </span>
                      <span>Uses: {link.use_count}{link.max_uses ? ` / ${link.max_uses}` : ""}</span>
                      <span>Code: {link.short_code}</span>
                      {link.expires_at && (
                        <span>Expires: {new Date(link.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-1">
                    <button
                      onClick={() => copyUrl(link)}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
                      title="Copy link"
                    >
                      {copied === link.id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={() => setQrLink(link)}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
                      title="Show QR code"
                    >
                      <QrCode size={16} />
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
                      title="Open checkout"
                    >
                      <ExternalLink size={16} />
                    </a>
                    {link.is_active && (
                      <button
                        onClick={() => deleteMut.mutate(link.id)}
                        disabled={deleteMut.isPending}
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                        title="Deactivate"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
