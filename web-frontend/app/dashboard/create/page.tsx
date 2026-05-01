"use client";
import type { ReactNode } from "react";

import { Header } from "@/components/organisms/Header";
import { CreateVaultWizard, type CreateVaultSubmitData } from "@/components/organisms/CreateVaultWizard";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import { createVaultOnChain } from "@/lib/anchor";
import { api } from "@/lib/api";
import { calculateFee } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";

export default function CreatePage(): ReactNode {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const queryClient = useQueryClient();

  const handleSubmit = async (
    data: CreateVaultSubmitData,
  ): Promise<{ txSignature: string; vaultAddress: string }> => {
    if (!publicKey || !anchorWallet) {
      toast.error("Connect your wallet first");
      throw new Error("Wallet not connected");
    }

    const amountLamports = Math.round(data.amountUsdc * 1_000_000);

    const { vaultAddress, txSignature, feeAmountLamports } = await createVaultOnChain(anchorWallet, {
      recipient: new PublicKey(data.recipientWallet),
      amountUsdc: amountLamports,
      description: data.description,
      conditions: data.conditions.map((c) => {
        if (c.type === "time_lock") return { type: "time_lock" as const, releaseTime: c.releaseTime, percentage: c.percentage };
        if (c.type === "milestone") return { type: "milestone" as const, description: c.description, approvers: c.approvers, percentage: c.percentage };
        if (c.type === "auto_split") return { type: "auto_split" as const, splits: c.splits.map((s) => ({ wallet: s.wallet, percentage: Number(s.percentage) })) };
        if (c.type === "oracle") return { type: "oracle" as const, feed: c.feed, operator: c.operator, threshold: Number(c.threshold), percentage: c.percentage };
        return { type: "category" as const, merchantRegistry: c.merchantRegistry, categories: c.categories, percentage: c.percentage };
      }),
    });

    try {
      await api.post("/vaults", {
        onChainId: vaultAddress.toBase58(),
        creatorWallet: publicKey.toBase58(),
        recipientWallet: data.recipientWallet,
        amountUsdc: amountLamports,
        releasedAmountUsdc: 0,
        status: "active",
        description: data.description,
        conditions: data.conditions,
        txSignature,
        feeAmountUsdc: feeAmountLamports,
      });
    } catch (err) {
      console.error("Backend sync failed:", err);
      toast.warning("Vault created on-chain but failed to sync with backend.");
    }

    queryClient.invalidateQueries({ queryKey: ["vaults"] });

    return { txSignature, vaultAddress: vaultAddress.toBase58() };
  };

  return (
    <div className="min-h-full">
      <Header title="Create Payment" />
      <div className="p-6">
        <CreateVaultWizard onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
