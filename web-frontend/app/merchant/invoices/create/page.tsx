"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export default function CreateInvoicePage(): ReactNode {
  const { user } = useAuthStore();
  const router = useRouter();

  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const merchantQuery = useQuery({
    queryKey: ["my-merchants"],
    queryFn: async () => {
      const res = await api.get<ApiResult<Array<{ id: string; business_name: string }>>>("/merchants/mine");
      return res.data.data;
    },
    enabled: !!user,
  });

  const merchantId = merchantQuery.data?.[0]?.id;

  const createMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post("/invoices", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Invoice created!");
      router.push("/merchant/invoices");
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  const addItem = () => setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmit = () => {
    if (!merchantId) return;
    const validItems = items.filter((i) => i.description && i.unitPrice > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    createMut.mutate({
      merchantId,
      lineItems: validItems.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: Math.round(i.unitPrice * 1_000_000),
      })),
      dueDate: dueDate || undefined,
      customerInfo: {
        name: customerName || undefined,
        email: customerEmail || undefined,
      },
      notes: notes || undefined,
    });
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/merchant/invoices"
          className="mb-3 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-gray-600"
        >
          <ArrowLeft size={14} /> Back to Invoices
        </Link>
        <h1 className="font-cabinet text-2xl font-bold text-gray-900">Create Invoice</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create an invoice for your customer. A payment link is auto-generated.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {/* Customer Info */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Customer Name</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Customer Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
          <button
            onClick={addItem}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>

        <div className="mb-6 space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex-1">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Description"
                />
              </div>
              <div className="w-20">
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Qty"
                />
              </div>
              <div className="w-32">
                <input
                  type="number"
                  step="0.01"
                  value={item.unitPrice || ""}
                  onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Price (USDC)"
                />
              </div>
              <div className="flex w-24 items-center justify-end pt-2 text-sm font-medium text-gray-700">
                ${(item.quantity * item.unitPrice).toFixed(2)}
              </div>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(idx)}
                  className="mt-2 text-gray-400 transition hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            placeholder="Payment terms, additional notes..."
          />
        </div>

        {/* Subtotal + Submit */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div>
            <p className="text-sm text-gray-500">
              Total: <span className="text-lg font-bold text-gray-900">${subtotal.toFixed(2)} USDC</span>
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={createMut.isPending || !merchantId}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {createMut.isPending ? "Creating..." : "Create Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}
