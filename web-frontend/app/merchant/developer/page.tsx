"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import {
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  X,
  Shield,
} from "lucide-react";

type ApiKey = {
  id: string;
  key_prefix: string;
  label: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  key?: string;
};

type WebhookEntry = {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  created_at: string;
  secret?: string;
};

const WEBHOOK_EVENTS = [
  "payment.completed",
  "payment.failed",
  "payment.expired",
  "refund.completed",
  "invoice.paid",
];

export default function DeveloperPage(): ReactNode {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [keyLabel, setKeyLabel] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["payment.completed"]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<string | null>(null);

  const merchantQuery = useQuery({
    queryKey: ["my-merchants"],
    queryFn: async () => {
      const res = await api.get<ApiResult<Array<{ id: string; business_name: string }>>>("/merchants/mine");
      return res.data.data;
    },
    enabled: !!user,
  });

  const merchantId = merchantQuery.data?.[0]?.id;

  const keysQuery = useQuery({
    queryKey: ["api-keys", merchantId],
    queryFn: async () => {
      const res = await api.get<ApiResult<ApiKey[]>>("/developer/api-keys", {
        params: { merchantId },
      });
      return res.data.data;
    },
    enabled: !!merchantId,
  });

  const webhooksQuery = useQuery({
    queryKey: ["webhooks", merchantId],
    queryFn: async () => {
      const res = await api.get<ApiResult<WebhookEntry[]>>("/developer/webhooks", {
        params: { merchantId },
      });
      return res.data.data;
    },
    enabled: !!merchantId,
  });

  const createKeyMut = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResult<ApiKey>>("/developer/api-keys", {
        merchantId,
        label: keyLabel || "Default",
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      setNewKey(data);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setKeyLabel("");
    },
    onError: () => toast.error("Failed to create API key"),
  });

  const revokeKeyMut = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/developer/api-keys/${id}/revoke`, { merchantId });
    },
    onSuccess: () => {
      toast.success("API key revoked");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const createWebhookMut = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResult<WebhookEntry>>("/developer/webhooks", {
        merchantId,
        url: webhookUrl,
        events: webhookEvents,
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Webhook created!");
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setShowWebhookModal(false);
      setWebhookUrl("");
      setWebhookEvents(["payment.completed"]);
    },
    onError: () => toast.error("Failed to create webhook"),
  });

  const deleteWebhookMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/developer/webhooks/${id}`, { data: { merchantId } });
    },
    onSuccess: () => {
      toast.success("Webhook deleted");
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleEvent = (event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const keys = keysQuery.data ?? [];
  const webhooks = webhooksQuery.data ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-cabinet text-2xl font-bold text-[var(--text)]">Developer Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage API keys and webhooks for programmatic access to the payment gateway.
        </p>
      </div>

      {/* API Keys Section */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-[var(--text)]">API Keys</h2>
          </div>
          <button
            onClick={() => setShowKeyModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800"
          >
            <Plus size={14} />
            New Key
          </button>
        </div>

        {keysQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-[var(--text-faint)]" size={20} />
          </div>
        ) : keys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] py-8 text-center">
            <Shield size={28} className="mx-auto mb-2 text-[var(--text-faint)]" />
            <p className="text-sm text-[var(--text-muted)]">No API keys</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className={`rounded-xl border bg-[var(--surface)] p-4 ${k.is_active ? "border-[var(--border)]" : "border-[var(--border)] opacity-60"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text)]">{k.label}</span>
                      {!k.is_active && (
                        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-400">Revoked</span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-[var(--text-faint)]">{k.key_prefix}••••••••</p>
                    <p className="mt-1 text-xs text-[var(--text-faint)]">
                      Created {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  {k.is_active && (
                    <button
                      onClick={() => revokeKeyMut.mutate(k.id)}
                      disabled={revokeKeyMut.isPending}
                      className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/100/10"
                      title="Revoke key"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhooks Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook size={18} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-[var(--text)]">Webhooks</h2>
          </div>
          <button
            onClick={() => setShowWebhookModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800"
          >
            <Plus size={14} />
            New Webhook
          </button>
        </div>

        {webhooksQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-[var(--text-faint)]" size={20} />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] py-8 text-center">
            <Webhook size={28} className="mx-auto mb-2 text-[var(--text-faint)]" />
            <p className="text-sm text-[var(--text-muted)]">No webhooks configured</p>
          </div>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div key={wh.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-mono text-sm text-[var(--text)]">{wh.url}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {wh.events.map((ev) => (
                        <span key={ev} className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-400">
                          {ev}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-faint)]">
                      {wh.failure_count > 0 && (
                        <span className="mr-2 text-amber-500">{wh.failure_count} failures</span>
                      )}
                      Created {new Date(wh.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteWebhookMut.mutate(wh.id)}
                    disabled={deleteWebhookMut.isPending}
                    className="ml-3 rounded-lg p-2 text-red-400 transition hover:bg-red-500/100/10"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text)]">
                {newKey ? "API Key Created" : "New API Key"}
              </h2>
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setNewKey(null);
                }}
                className="text-[var(--text-faint)] hover:text-[var(--text-muted)]"
              >
                <X size={20} />
              </button>
            </div>

            {newKey ? (
              <div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="mb-2 text-xs font-medium text-amber-700">
                    Copy this key now. It won&apos;t be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all rounded bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text)]">
                      {newKey.key}
                    </code>
                    <button
                      onClick={() => copyText(newKey.key!, "newkey")}
                      className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
                    >
                      {copiedId === "newkey" ? (
                        <Check size={16} className="text-emerald-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowKeyModal(false);
                    setNewKey(null);
                  }}
                  className="mt-4 w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Label</label>
                  <input
                    value={keyLabel}
                    onChange={(e) => setKeyLabel(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Production, Staging..."
                  />
                </div>
                <button
                  onClick={() => createKeyMut.mutate()}
                  disabled={createKeyMut.isPending}
                  className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
                >
                  {createKeyMut.isPending ? "Generating..." : "Generate API Key"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text)]">New Webhook</h2>
              <button
                onClick={() => setShowWebhookModal(false)}
                className="text-[var(--text-faint)] hover:text-[var(--text-muted)]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Endpoint URL</label>
                <input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="https://your-server.com/webhooks"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--text-muted)]">Events</label>
                <div className="space-y-2">
                  {WEBHOOK_EVENTS.map((event) => (
                    <label key={event} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={webhookEvents.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="rounded border-[var(--border-strong)] text-emerald-400 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-[var(--text)]">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={() => createWebhookMut.mutate()}
                disabled={!webhookUrl || webhookEvents.length === 0 || createWebhookMut.isPending}
                className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                {createWebhookMut.isPending ? "Creating..." : "Create Webhook"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
