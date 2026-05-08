"use client";

import { useState, useCallback, useEffect } from "react";

export type SavedWallet = {
  id: string;
  name: string;
  address: string;
  createdAt: number;
};

const STORAGE_KEY = "pm_saved_wallets";

function loadWallets(): SavedWallet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistWallets(wallets: SavedWallet[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
}

export function useSavedWallets() {
  const [wallets, setWallets] = useState<SavedWallet[]>([]);

  useEffect(() => {
    setWallets(loadWallets());
  }, []);

  const addWallet = useCallback((name: string, address: string) => {
    setWallets((prev) => {
      if (prev.some((w) => w.address === address)) return prev;
      const next = [...prev, { id: crypto.randomUUID(), name, address, createdAt: Date.now() }];
      persistWallets(next);
      return next;
    });
  }, []);

  const removeWallet = useCallback((id: string) => {
    setWallets((prev) => {
      const next = prev.filter((w) => w.id !== id);
      persistWallets(next);
      return next;
    });
  }, []);

  const updateWallet = useCallback((id: string, name: string) => {
    setWallets((prev) => {
      const next = prev.map((w) => (w.id === id ? { ...w, name } : w));
      persistWallets(next);
      return next;
    });
  }, []);

  const isAddressSaved = useCallback(
    (address: string) => wallets.some((w) => w.address === address),
    [wallets],
  );

  return { wallets, addWallet, removeWallet, updateWallet, isAddressSaved };
}
