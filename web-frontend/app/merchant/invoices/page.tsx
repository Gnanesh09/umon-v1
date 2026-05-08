"use client";

import { type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Send,
  XCircle,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

type Invoice = {
  id: string;
  invoice_number: string;
  merchant_id: string;
  status: string;
  line_items: Array<{ description: string; quantity: number; unitPrice: number }>;
  subtotal_usdc: number;
  total_usdc: number;
  customer_name: string | null;
  customer_email: string | null;
  due_date: string | null;
  payment_link_id: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  draft: { icon: Clock, color: "text-[var(--text-muted)]", bg: "bg-[var(--surface-3)]" },
  sent: { icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
  paid: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  overdue: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  cancelled: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

export default function InvoicesPage(): ReactNode {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const merchantQuery = useQuery({
    queryKey: ["my-merchants"],
    queryFn: async () => {
      const res = await api.get<ApiResult<Array<{ id: string; business_name: string }>>>("/merchants/mine");
      return res.data.data;
    },
    enabled: !!user,
  });

  const merchantId = merchantQuery.data?.[0]?.id;

  const invoicesQuery = useQuery({
    queryKey: ["invoices", merchantId],
    queryFn: async () => {
      const res = await api.get<ApiResult<Invoice[]>>("/invoices", {
        params: { merchantId },
      });
      return res.data.data;
    },
    enabled: !!merchantId,
  });

  const sendMut = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/invoices/${id}/send`);
    },
    onSuccess: () => {
      toast.success("Invoice marked as sent");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: () => toast.error("Failed to send invoice"),
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/invoices/${id}/cancel`);
    },
    onSuccess: () => {
      toast.success("Invoice cancelled");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: () => toast.error("Failed to cancel invoice"),
  });

  const invoices = invoicesQuery.data ?? [];
  const totalBilled = invoices.reduce((s, inv) => s + inv.total_usdc, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, inv) => s + inv.total_usdc, 0);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-cabinet text-2xl font-bold text-[var(--text)]">Invoices</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Create and manage invoices for your customers.</p>
        </div>
        <Link
          href="/merchant/invoices/create"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          <Plus size={16} />
          New Invoice
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--text-muted)]">Total Billed</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">
            ${(totalBilled / 1_000_000).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--text-muted)]">Total Collected</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            ${(totalPaid / 1_000_000).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--text-muted)]">Invoices</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">{invoices.length}</p>
        </div>
      </div>

      {/* Invoice List */}
      {invoicesQuery.isLoading || merchantQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[var(--text-faint)]" size={24} />
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] py-16 text-center">
          <FileText size={40} className="mx-auto mb-3 text-[var(--text-faint)]" />
          <p className="text-[var(--text-muted)]">No invoices yet</p>
          <p className="mt-1 text-xs text-[var(--text-faint)]">Create your first invoice to start billing.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="divide-y divide-gray-100">
            {invoices.map((inv) => {
              const style = STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft;
              const Icon = style.icon;
              return (
                <div key={inv.id} className="flex items-center justify-between px-5 py-4 transition hover:bg-[var(--surface-2)]">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${style.bg}`}>
                      <Icon size={18} className={style.color} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--text)]">{inv.invoice_number}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.color}`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-faint)]">
                        {inv.customer_name ?? "No customer"} &middot;{" "}
                        {inv.line_items.length} item{inv.line_items.length !== 1 ? "s" : ""} &middot;{" "}
                        {new Date(inv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-[var(--text)]">
                      ${(inv.total_usdc / 1_000_000).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1">
                      {inv.status === "draft" && (
                        <>
                          <button
                            onClick={() => sendMut.mutate(inv.id)}
                            disabled={sendMut.isPending}
                            className="rounded-lg p-2 text-blue-500 transition hover:bg-blue-50"
                            title="Mark as sent"
                          >
                            <Send size={14} />
                          </button>
                          <button
                            onClick={() => cancelMut.mutate(inv.id)}
                            disabled={cancelMut.isPending}
                            className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/100/10"
                            title="Cancel"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {inv.status === "sent" && (
                        <button
                          onClick={() => cancelMut.mutate(inv.id)}
                          disabled={cancelMut.isPending}
                          className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/100/10"
                          title="Cancel"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
