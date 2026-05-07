"use client";

import { type ReactNode, useState, useEffect } from "react";
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
  QrCode,
  ExternalLink,
  Loader2,
  X,
  LinkIcon,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Eye,
  DollarSign,
  Users,
  Calendar,
  Wallet,
  MoreHorizontal,
  Save,
  ArrowLeft,
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
  updated_at: string;
  paymentUrl?: string;
};

type ModalMode = "create" | "edit" | "qr" | null;

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

const emptyForm = {
  title: "",
  description: "",
  amountUsdc: "",
  recipientWallet: "",
  maxUses: "",
};

export default function PaymentLinksPage(): ReactNode {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalMode>(null);
  const [editingLink, setEditingLink] = useState<PaymentLink | null>(null);
  const [qrLink, setQrLink] = useState<PaymentLink | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

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
      closeModal();
    },
    onError: () => toast.error("Failed to create payment link"),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await api.put(`/payment-links/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Payment link updated!");
      queryClient.invalidateQueries({ queryKey: ["payment-links"] });
      closeModal();
    },
    onError: () => toast.error("Failed to update payment link"),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await api.put(`/payment-links/${id}`, { isActive });
      return res.data;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? "Link activated" : "Link deactivated");
      queryClient.invalidateQueries({ queryKey: ["payment-links"] });
    },
    onError: () => toast.error("Failed to toggle link"),
  });

  function closeModal() {
    setModal(null);
    setEditingLink(null);
    setQrLink(null);
    setForm(emptyForm);
  }

  function openCreate() {
    setForm(emptyForm);
    setEditingLink(null);
    setModal("create");
  }

  function openEdit(link: PaymentLink) {
    setEditingLink(link);
    setForm({
      title: link.title,
      description: link.description ?? "",
      amountUsdc: link.amount_usdc ? (link.amount_usdc / 1_000_000).toString() : "",
      recipientWallet: link.recipient_wallet,
      maxUses: link.max_uses?.toString() ?? "",
    });
    setModal("edit");
    setMenuOpen(null);
  }

  function openQr(link: PaymentLink) {
    setQrLink(link);
    setModal("qr");
    setMenuOpen(null);
  }

  function handleSubmit() {
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description || undefined,
      recipientWallet: form.recipientWallet || user?.walletAddress,
      amountUsdc: form.amountUsdc ? Number(form.amountUsdc) * 1_000_000 : undefined,
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
    };

    if (modal === "edit" && editingLink) {
      updateMut.mutate({ id: editingLink.id, payload });
    } else {
      payload.ownerType = "merchant";
      createMut.mutate(payload);
    }
  }

  const copyUrl = (link: PaymentLink) => {
    const url = `${FRONTEND_URL}/pay/${link.short_code}`;
    navigator.clipboard.writeText(url);
    setCopied(link.id);
    toast.success("Link copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  // Close context menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

  const links = linksQuery.data ?? [];
  const activeLinks = links.filter((l) => l.is_active);
  const inactiveLinks = links.filter((l) => !l.is_active);
  const isBusy = createMut.isPending || updateMut.isPending;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-cabinet text-2xl font-bold text-gray-900">Payment Links</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create, manage, and track payment links for your business.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
        >
          <Plus size={16} />
          Create Link
        </button>
      </div>

      {/* Stats row */}
      {links.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Total Links", value: links.length, icon: Link2 },
            { label: "Active", value: activeLinks.length, icon: ToggleRight },
            { label: "Total Uses", value: links.reduce((s, l) => s + l.use_count, 0), icon: Users },
            {
              label: "With Amount",
              value: links.filter((l) => l.amount_usdc).length,
              icon: DollarSign,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Icon size={12} />
                {label}
              </div>
              <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-0 shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "edit" ? "Edit Payment Link" : "New Payment Link"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="e.g. Coffee Payment"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="Optional description for your customers"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                    Amount (USDC)
                  </label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={form.amountUsdc}
                      onChange={(e) => setForm((p) => ({ ...p, amountUsdc: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                      placeholder="Flexible"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">Leave blank for flexible amount</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                    Max Uses
                  </label>
                  <div className="relative">
                    <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={form.maxUses}
                      onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                      placeholder="Unlimited"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">Leave blank for unlimited</p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Recipient Wallet
                </label>
                <div className="relative">
                  <Wallet size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={form.recipientWallet}
                    onChange={(e) => setForm((p) => ({ ...p, recipientWallet: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-4 font-mono text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    placeholder={user?.walletAddress ?? "Your wallet address"}
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Defaults to your connected wallet</p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.title || isBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {isBusy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : modal === "edit" ? (
                  <Save size={14} />
                ) : (
                  <Plus size={14} />
                )}
                {modal === "edit" ? "Save Changes" : "Create Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {modal === "qr" && qrLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">QR Code</h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <QRCodeDisplay
              url={`${FRONTEND_URL}/pay/${qrLink.short_code}`}
              title={qrLink.title}
              size={220}
            />
            <button
              onClick={() => copyUrl(qrLink)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Copy size={14} />
              Copy Link URL
            </button>
          </div>
        </div>
      )}

      {/* Links List */}
      {linksQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-20 text-center">
          <LinkIcon size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">No payment links yet</p>
          <p className="mt-1 text-sm text-gray-400">Create your first link to start accepting payments.</p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Plus size={16} />
            Create Your First Link
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active links */}
          {activeLinks.length > 0 && (
            <div className="space-y-3">
              {activeLinks.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  copied={copied}
                  menuOpen={menuOpen}
                  onCopy={copyUrl}
                  onEdit={openEdit}
                  onQr={openQr}
                  onToggle={(id, active) => toggleMut.mutate({ id, isActive: active })}
                  onMenuToggle={(id) => setMenuOpen(menuOpen === id ? null : id)}
                />
              ))}
            </div>
          )}

          {/* Inactive links */}
          {inactiveLinks.length > 0 && (
            <>
              <div className="flex items-center gap-3 pt-4">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-medium text-gray-400">
                  Inactive ({inactiveLinks.length})
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="space-y-3">
                {inactiveLinks.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    copied={copied}
                    menuOpen={menuOpen}
                    onCopy={copyUrl}
                    onEdit={openEdit}
                    onQr={openQr}
                    onToggle={(id, active) => toggleMut.mutate({ id, isActive: active })}
                    onMenuToggle={(id) => setMenuOpen(menuOpen === id ? null : id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Link Card                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function LinkCard({
  link,
  copied,
  menuOpen,
  onCopy,
  onEdit,
  onQr,
  onToggle,
  onMenuToggle,
}: {
  link: PaymentLink;
  copied: string | null;
  menuOpen: string | null;
  onCopy: (l: PaymentLink) => void;
  onEdit: (l: PaymentLink) => void;
  onQr: (l: PaymentLink) => void;
  onToggle: (id: string, active: boolean) => void;
  onMenuToggle: (id: string) => void;
}): ReactNode {
  const url = `${FRONTEND_URL}/pay/${link.short_code}`;

  return (
    <div
      className={`group rounded-xl border bg-white transition ${
        link.is_active
          ? "border-gray-200 hover:border-gray-300 hover:shadow-md"
          : "border-gray-100 opacity-60 hover:opacity-80"
      }`}
    >
      <div className="flex items-start gap-4 p-5">
        {/* Icon */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          link.is_active ? "bg-emerald-50" : "bg-gray-100"
        }`}>
          <Link2 size={18} className={link.is_active ? "text-emerald-600" : "text-gray-400"} />
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">{link.title}</h3>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              link.is_active
                ? "bg-emerald-50 text-emerald-600"
                : "bg-gray-100 text-gray-500"
            }`}>
              {link.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          {link.description && (
            <p className="mt-0.5 truncate text-xs text-gray-500">{link.description}</p>
          )}

          {/* Meta row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <DollarSign size={11} />
              {link.amount_usdc ? `$${(link.amount_usdc / 1_000_000).toFixed(2)}` : "Flexible"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye size={11} />
              {link.use_count} use{link.use_count !== 1 ? "s" : ""}
              {link.max_uses ? ` / ${link.max_uses}` : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {new Date(link.created_at).toLocaleDateString()}
            </span>
            {link.expires_at && (
              <span className="inline-flex items-center gap-1 text-amber-500">
                <Calendar size={11} />
                Expires {new Date(link.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* URL preview */}
          <div className="mt-2.5 flex items-center gap-2">
            <code className="truncate rounded-lg bg-gray-50 px-2.5 py-1 text-[11px] text-gray-500">
              {url}
            </code>
            <button
              onClick={() => onCopy(link)}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              {copied === link.id ? (
                <Check size={13} className="text-emerald-500" />
              ) : (
                <Copy size={13} />
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="relative flex shrink-0 items-center gap-1">
          <button
            onClick={() => onEdit(link)}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onQr(link)}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            title="QR Code"
          >
            <QrCode size={15} />
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle(link.id);
              }}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <MoreHorizontal size={15} />
            </button>

            {/* Dropdown */}
            {menuOpen === link.id && (
              <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
                >
                  <ExternalLink size={14} />
                  Open Checkout
                </a>
                <button
                  onClick={() => onCopy(link)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
                >
                  <Copy size={14} />
                  Copy Link
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => onToggle(link.id, !link.is_active)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-gray-50"
                >
                  {link.is_active ? (
                    <>
                      <ToggleLeft size={14} className="text-red-400" />
                      <span className="text-red-500">Deactivate</span>
                    </>
                  ) : (
                    <>
                      <ToggleRight size={14} className="text-emerald-500" />
                      <span className="text-emerald-600">Reactivate</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
