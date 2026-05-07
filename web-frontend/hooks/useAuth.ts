"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api } from "@/lib/api";
import { useAuthStore, type UserRole } from "@/stores/authStore";

function uint8ArrayToBase58(bytes: Uint8Array): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = BigInt(0);
  for (const byte of bytes) {
    num = num * BigInt(256) + BigInt(byte);
  }
  let str = "";
  while (num > 0) {
    str = ALPHABET[Number(num % BigInt(58))] + str;
    num = num / BigInt(58);
  }
  for (const byte of bytes) {
    if (byte === 0) str = "1" + str;
    else break;
  }
  return str;
}

function isJwtValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now() + 60_000;
  } catch {
    return false;
  }
}

export function useAuth() {
  const { publicKey, signMessage, connected, disconnecting } = useWallet();
  const authenticating = useRef(false);
  const { user, setUser, setLoading } = useAuthStore();

  const loadProfile = useCallback(async (walletAddress: string) => {
    try {
      const { data: meRes } = await api.get("/auth/me");
      const profile = meRes.data as Record<string, unknown>;

      let merchantStatus: string | undefined;
      let merchantId: string | undefined;
      try {
        const { data: mRes } = await api.get("/merchants/me/current");
        if (mRes.data) {
          merchantStatus = mRes.data.status as string;
          merchantId = mRes.data.merchant_id as string;
        }
      } catch {
        // No merchant profile
      }

      setUser({
        walletAddress,
        role: (profile.role as UserRole) ?? "user",
        displayName: profile.display_name as string | undefined,
        email: profile.email as string | undefined,
        merchantId,
        merchantStatus,
      });
    } catch {
      setUser({ walletAddress, role: "user" });
    }
    setLoading(false);
  }, [setUser, setLoading]);

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage || typeof signMessage !== "function") return;

    const walletAddress = publicKey.toBase58();
    const existing = localStorage.getItem("pm_jwt");
    const storedWallet = localStorage.getItem("pm_jwt_wallet");

    if (existing && storedWallet === walletAddress && isJwtValid(existing)) {
      if (!user || user.walletAddress !== walletAddress) {
        await loadProfile(walletAddress);
      }
      return;
    }

    if (authenticating.current) return;
    authenticating.current = true;

    try {
      const { data: nonceRes } = await api.post("/auth/nonce", { walletAddress });
      const nonce = nonceRes.data.nonce as string;

      const message = new TextEncoder().encode(`PowerMoney login nonce: ${nonce}`);
      const signature = await signMessage(message);
      const signatureEncoded = uint8ArrayToBase58(signature);

      const { data: verifyRes } = await api.post("/auth/verify", {
        walletAddress,
        signature: signatureEncoded,
        nonce,
      });

      const token = verifyRes.data.token as string;
      localStorage.setItem("pm_jwt", token);
      localStorage.setItem("pm_jwt_wallet", walletAddress);

      await loadProfile(walletAddress);
    } catch (err) {
      console.error("[useAuth] Authentication failed:", err);
      setLoading(false);
    } finally {
      authenticating.current = false;
    }
  }, [publicKey, signMessage, user, loadProfile, setLoading]);

  useEffect(() => {
    if (connected && publicKey && signMessage) {
      authenticate();
    } else if (!connected && !publicKey) {
      setLoading(false);
    }
  }, [connected, publicKey, signMessage, authenticate, setLoading]);

  useEffect(() => {
    if (disconnecting) {
      localStorage.removeItem("pm_jwt");
      localStorage.removeItem("pm_jwt_wallet");
      setUser(null);
    }
  }, [disconnecting, setUser]);

  return useAuthStore();
}
