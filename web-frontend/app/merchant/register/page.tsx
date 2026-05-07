"use client";

import { type ReactNode, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MERCHANT_CATEGORIES } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Store, CheckCircle2 } from "lucide-react";

export default function RegisterBusinessPage(): ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState<{ merchantId: string; businessName: string } | null>(null);

  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    category: "Medical",
    businessWallet: "",
    description: "",
    country: "",
    city: "",
    website: "",
    contactEmail: "",
    contactPhone: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/merchants/register", form);
      return res.data;
    },
    onSuccess: (data) => {
      setSuccess({
        merchantId: data.data.merchant_id,
        businessName: form.businessName,
      });
      queryClient.invalidateQueries({ queryKey: ["merchant-businesses"] });
      toast.success("Business registered successfully!");
    },
    onError: (err: Error & { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err.response?.data?.error?.message ?? "Failed to register business");
    },
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  if (success) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h1 className="font-cabinet text-2xl font-bold text-gray-900">Application Submitted!</h1>
        <p className="mt-2 text-gray-500">
          Your business <span className="font-medium text-gray-900">{success.businessName}</span> has been submitted for review.
        </p>
        <div className="mt-4 inline-block rounded-lg bg-gray-50 px-4 py-2">
          <p className="text-xs text-gray-400">Your Merchant ID</p>
          <p className="font-mono text-lg font-bold text-gray-900">{success.merchantId}</p>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          The Umon team will review your application. You&apos;ll be notified once approved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => { setSuccess(null); setForm({ businessName: "", businessType: "", category: "Medical", businessWallet: "", description: "", country: "", city: "", website: "", contactEmail: "", contactPhone: "" }); }}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Register Another
          </button>
          <button
            onClick={() => router.push("/merchant/businesses")}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            View My Businesses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-cabinet text-2xl font-bold text-gray-900">Register a Business</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add a new business to your merchant account. Each business gets a unique Merchant ID (UMN-XXXXX).
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-emerald-50 p-3">
          <Store size={18} className="text-emerald-600" />
          <p className="text-sm text-emerald-700">
            Each business gets its own Merchant ID and unique payment wallet. You can register multiple businesses under one account.
          </p>
        </div>

        {/* Business Wallet — full width, prominent */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Business Wallet Address *</label>
          <input
            value={form.businessWallet}
            onChange={set("businessWallet")}
            placeholder="Solana wallet address for this business (e.g. 7xKX...)"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 font-mono text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <p className="mt-1 text-xs text-gray-400">Each business must have a unique wallet to receive payments. This is NOT your login wallet.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Business Name *</label>
            <input
              value={form.businessName}
              onChange={set("businessName")}
              placeholder="RP Logistics"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Business Type</label>
            <input
              value={form.businessType}
              onChange={set("businessType")}
              placeholder="Logistics, SaaS, Retail..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Category *</label>
            <select
              value={form.category}
              onChange={set("category")}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {MERCHANT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Contact Email</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={set("contactEmail")}
              placeholder="business@example.com"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Country</label>
            <input
              value={form.country}
              onChange={set("country")}
              placeholder="India"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">City</label>
            <input
              value={form.city}
              onChange={set("city")}
              placeholder="Bangalore"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Website</label>
            <input
              value={form.website}
              onChange={set("website")}
              placeholder="https://example.com"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
            <input
              value={form.contactPhone}
              onChange={set("contactPhone")}
              placeholder="+91..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={form.description}
            onChange={set("description")}
            placeholder="Brief description of your business and services..."
            rows={3}
            className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={!form.businessName || !form.category || !form.businessWallet || form.businessWallet.length < 32 || mutation.isPending}
          className="mt-6 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? "Submitting..." : "Submit Application"}
        </button>
      </div>
    </div>
  );
}
