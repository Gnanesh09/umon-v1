"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { QRCodeDisplay } from "@/components/molecules/QRCodeDisplay";
import { toast } from "sonner";
import {
  QrCode,
  Link2,
  Plus,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Wallet,
  Loader2,
  X,
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
  created_at: string;
};

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

export default function ReceivePage(): ReactNode {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedQr, setSelectedQr] = useState<PaymentLink | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  const linksQuery = useQuery({
    queryKey: ["my-payment-links"],
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
      queryClient.invalidateQueries({ queryKey: ["my-payment-links"] });
      setShowCreate(false);
      setTitle("");
      setAmount("");
    },
    onError: () => toast.error("Failed to create link"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payment-links/${id}`);
    },
    onSuccess: () => {
      toast.success("Link deactivated");
      queryClient.invalidateQueries({ queryKey: ["my-payment-links"] });
    },
  });

  const handleCreate = () => {
    if (!user) return;
    createMut.mutate({
      title: title || "Receive Payment",
      recipientWallet: user.walletAddress,
      amountUsdc: amount ? Number(amount) * 1_000_000 : undefined,
      ownerType: "user",
    });
  };

  const copyUrl = (link: PaymentLink) => {
    const url = `${FRONTEND_URL}/pay/${link.short_code}`;
    navigator.clipboard.writeText(url);
    setCopied(link.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const links = (linksQuery.data ?? []).filter((l) => l.is_active);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-8">
        <h1 className="font-cabinet text-2xl font-bold text-gray-900">Receive Payments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Share your payment link or QR code to receive USDC from anyone.
        </p>
      </div>

      {/* Wallet Address */}
      {user && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <Wallet size={18} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400">Your Wallet</p>
              <p className="font-mono text-sm text-gray-700">{user.walletAddress}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick QR for wallet */}
      {user && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <QRCodeDisplay
              url={`solana:${user.walletAddress}`}
              title="Your Wallet QR"
              size={160}
            />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-sm font-semibold text-gray-900">Direct Wallet QR</h3>
              <p className="mt-1 text-xs text-gray-500">
                Anyone can scan this to see your wallet address. For tracked payments with automatic confirmation, create a payment link below.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                <Plus size={14} />
                Create Payment Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">New Payment Link</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Coffee fund, Freelance work..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Amount (USDC) — leave blank for any amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="10.00"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={createMut.isPending}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {createMut.isPending ? "Creating..." : "Create Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Payment QR</h2>
              <button onClick={() => setSelectedQr(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <QRCodeDisplay
              url={`${FRONTEND_URL}/pay/${selectedQr.short_code}`}
              title={selectedQr.title}
              size={220}
            />
          </div>
        </div>
      )}

      {/* Links List */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Your Payment Links</h2>
      </div>

      {linksQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <Link2 size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">No payment links yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => {
            const url = `${FRONTEND_URL}/pay/${link.short_code}`;
            return (
              <div key={link.id} className="rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{link.title}</p>
                    <p className="text-xs text-gray-400">
                      {link.amount_usdc ? `$${(link.amount_usdc / 1_000_000).toFixed(2)} USDC` : "Flexible amount"}{" "}
                      &middot; {link.use_count} uses
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyUrl(link)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                    >
                      {copied === link.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => setSelectedQr(link)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                    >
                      <QrCode size={14} />
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => deleteMut.mutate(link.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
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
