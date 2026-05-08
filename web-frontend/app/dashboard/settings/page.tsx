"use client";

import { ReactNode, useState, useEffect } from "react";
import { Header } from "@/components/organisms/Header";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Switch } from "@/components/atoms/Switch";
import { CopyButton } from "@/components/atoms/CopyButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import { truncateAddress } from "@/lib/format";
import { explorerAddressUrl } from "@/lib/constants";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  Key,
  RefreshCw,
  Wallet,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  BookmarkPlus,
  Star,
} from "lucide-react";
import { useSavedWallets, type SavedWallet } from "@/hooks/useSavedWallets";

type UserProfile = {
  id: string;
  wallet_address: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

function SavedWalletsSection(): ReactNode {
  const { wallets, addWallet, removeWallet, updateWallet } = useSavedWallets();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleAdd(): void {
    if (!newName.trim() || newAddress.length < 32) return;
    addWallet(newName.trim(), newAddress.trim());
    setNewName("");
    setNewAddress("");
    setAdding(false);
    toast.success(`Wallet "${newName.trim()}" saved`);
  }

  function handleUpdate(id: string): void {
    if (!editName.trim()) return;
    updateWallet(id, editName.trim());
    setEditingId(null);
    toast.success("Wallet updated");
  }

  function handleDelete(id: string, name: string): void {
    removeWallet(id);
    setConfirmDeleteId(null);
    toast.success(`"${name}" removed`);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)]/15 to-[var(--primary)]/5">
            <Wallet className="h-4.5 w-4.5 text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Saved Wallets</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {wallets.length} wallet{wallets.length !== 1 ? "s" : ""} saved
            </p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
            <Plus className="h-3.5 w-3.5" /> Add Wallet
          </Button>
        </motion.div>
      </div>

      <div className="divide-y divide-[var(--border)]">
        <AnimatePresence mode="popLayout">
          {adding && (
            <motion.div
              key="add-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[var(--primary)]/[0.02] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookmarkPlus className="h-4 w-4 text-[var(--primary)]" />
                  <span className="text-sm font-semibold text-[var(--text)]">New Wallet</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Wallet name"
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                    autoFocus
                  />
                  <input
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Solana wallet address"
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 font-mono text-xs text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || newAddress.length < 32}>
                    <Check className="h-3.5 w-3.5" /> Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAdding(false);
                      setNewName("");
                      setNewAddress("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {wallets.length === 0 && !adding ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-10"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-2)]">
                <Star className="h-6 w-6 text-[var(--text-faint)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--text)]">No saved wallets yet</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Save wallet addresses for quick selection when creating vaults
                </p>
              </div>
            </motion.div>
          ) : (
            wallets.map((w) => (
              <motion.div
                key={w.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="group relative"
              >
                <div className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)]/15 to-[var(--primary)]/5">
                    <span className="text-xs font-bold text-[var(--primary)]">
                      {w.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    {editingId === w.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 w-40 rounded border border-[var(--primary)] bg-[var(--surface-2)] px-2 text-sm font-medium text-[var(--text)] outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(w.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <button
                          onClick={() => handleUpdate(w.id)}
                          className="flex h-6 w-6 items-center justify-center rounded text-[var(--success)] hover:bg-[var(--success-subtle)]"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-[var(--text)]">{w.name}</p>
                    )}
                    <p className="truncate font-mono text-[11px] text-[var(--text-muted)]">
                      {w.address}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <CopyButton text={w.address} />
                    <button
                      onClick={() => {
                        setEditingId(w.id);
                        setEditName(w.name);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    {confirmDeleteId === w.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(w.id, w.name)}
                          className="flex h-8 items-center gap-1 rounded-md bg-[var(--error)] px-2 text-[11px] font-medium text-white transition hover:opacity-90"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(w.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--error-subtle)] hover:text-[var(--error)]"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function SettingsPage(): ReactNode {
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const walletAddress = publicKey?.toBase58() ?? "";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [notifyOnRelease, setNotifyOnRelease] = useState(true);
  const [notifyOnApproval, setNotifyOnApproval] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["user-profile", walletAddress],
    queryFn: async () => {
      const token = localStorage.getItem("pm_jwt");
      if (!token) return null;
      const res = await api.get<ApiResult<UserProfile>>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: walletAddress.length > 0,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setDisplayName(profileQuery.data.display_name ?? "");
      setEmail(profileQuery.data.email ?? "");
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("pm_jwt");
      await api.put(
        "/auth/me",
        { displayName, email },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
    },
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: () => {
      toast.error("Failed to save profile");
    },
  });

  const generateApiKey = (): void => {
    const key = `pm_${Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
    setApiKey(key);
    localStorage.setItem("pm_api_key", key);
    toast.success("API key generated");
  };

  return (
    <div className="min-h-full">
      <Header title="Settings" />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Profile */}
        <div className="card p-5">
          <h2 className="mb-4 text-base font-semibold">Profile</h2>
          <div className="grid gap-4">
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              helper="Used for email notifications when enabled"
            />
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              className="justify-self-start"
            >
              Save Profile
            </Button>
          </div>
        </div>

        {/* Wallet */}
        <div className="card p-5">
          <h2 className="mb-4 text-base font-semibold">Wallet</h2>
          {walletAddress ? (
            <div className="flex items-center gap-2">
              <div className="flex h-10 flex-1 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 font-mono text-sm">
                {truncateAddress(walletAddress, 12, 8)}
              </div>
              <CopyButton text={walletAddress} />
              <a
                href={explorerAddressUrl(walletAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] transition hover:text-[var(--primary)]"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Connect your wallet to view details</p>
          )}
        </div>

        {/* Saved Wallets */}
        <SavedWalletsSection />

        {/* Notifications */}
        <div className="card p-5">
          <h2 className="mb-4 text-base font-semibold">Notification Preferences</h2>
          <div className="space-y-4">
            <Switch
              checked={notifyOnRelease}
              onChange={setNotifyOnRelease}
              label="Email on fund release"
            />
            <Switch
              checked={notifyOnApproval}
              onChange={setNotifyOnApproval}
              label="Email on approval request"
            />
          </div>
        </div>

        {/* API Key */}
        <div className="card p-5">
          <h2 className="mb-4 text-base font-semibold">API Access</h2>
          <p className="mb-3 text-xs text-[var(--text-muted)]">
            Generate an API key to use the PowerMoney SDK programmatically.
          </p>
          {apiKey ? (
            <div className="flex items-center gap-2">
              <div className="flex h-10 flex-1 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 font-mono text-xs">
                {apiKey}
              </div>
              <CopyButton text={apiKey} />
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={generateApiKey}>
              <Key className="h-4 w-4" /> Generate API Key
            </Button>
          )}
          {apiKey ? (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="danger" onClick={() => { setApiKey(null); localStorage.removeItem("pm_api_key"); toast.success("API key revoked"); }}>
                Revoke
              </Button>
              <Button size="sm" variant="secondary" onClick={generateApiKey}>
                <RefreshCw className="h-4 w-4" /> Regenerate
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
