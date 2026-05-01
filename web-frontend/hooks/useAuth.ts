"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api } from "@/lib/api";

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

export function useAuth(): void {
  const { publicKey, signMessage, connected } = useWallet();
  const authenticating = useRef(false);

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) return;

    const walletAddress = publicKey.toBase58();
    const existing = localStorage.getItem("pm_jwt");
    const storedWallet = localStorage.getItem("pm_jwt_wallet");
    if (existing && storedWallet === walletAddress) return;

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

      localStorage.setItem("pm_jwt", verifyRes.data.token);
      localStorage.setItem("pm_jwt_wallet", walletAddress);
      console.log("[useAuth] Authenticated successfully");
    } catch (err) {
      console.error("[useAuth] Authentication failed:", err);
    } finally {
      authenticating.current = false;
    }
  }, [publicKey, signMessage]);

  useEffect(() => {
    if (connected && publicKey && signMessage) {
      authenticate();
    }
  }, [connected, publicKey, signMessage, authenticate]);

  useEffect(() => {
    if (!connected) {
      localStorage.removeItem("pm_jwt");
      localStorage.removeItem("pm_jwt_wallet");
    }
  }, [connected]);
}
