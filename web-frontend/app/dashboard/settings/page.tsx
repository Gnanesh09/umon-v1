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
import { ExternalLink, Key, RefreshCw } from "lucide-react";

type UserProfile = {
  id: string;
  wallet_address: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

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
