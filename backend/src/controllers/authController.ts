import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import bs58 from "bs58";
import * as ed from "@noble/ed25519";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { generateNonce } from "../utils/crypto.js";
import { sendSuccess } from "../utils/response.js";
import type { AuthenticatedRequest } from "../types/api.js";

ed.etc.sha512Sync = (...m) => new Uint8Array(createHash("sha512").update(ed.etc.concatBytes(...m)).digest());

const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

export async function createNonce(req: Request, res: Response): Promise<Response> {
  const { walletAddress } = req.body as { walletAddress: string };
  const nonce = generateNonce();
  nonceStore.set(walletAddress, { nonce, expiresAt: Date.now() + 5 * 60_000 });
  return sendSuccess(res, 201, { nonce });
}

export async function verifySignature(req: Request, res: Response): Promise<Response> {
  const { walletAddress, signature, nonce } = req.body as {
    walletAddress: string;
    signature: string;
    nonce: string;
  };

  const stored = nonceStore.get(walletAddress);
  if (!stored || stored.nonce !== nonce || stored.expiresAt < Date.now()) {
    throw new AppError("INVALID_NONCE", "Nonce is invalid or expired", 401);
  }

  const walletBytes = bs58.decode(walletAddress);
  const sigBytes = bs58.decode(signature);
  const messageBytes = new TextEncoder().encode(`PowerMoney login nonce: ${nonce}`);

  const isValid = ed.verify(sigBytes, messageBytes, walletBytes);
  if (!isValid) {
    throw new AppError("INVALID_SIGNATURE", "Wallet signature verification failed", 401);
  }

  const token = jwt.sign({}, env.JWT_SECRET, {
    subject: walletAddress,
    expiresIn: "24h",
  });

  const { error } = await supabase
    .from("users")
    .upsert({ wallet_address: walletAddress, updated_at: new Date().toISOString() }, { onConflict: "wallet_address" });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Failed to upsert user", 500, { details: error.message });
  }

  nonceStore.delete(walletAddress);

  return sendSuccess(res, 200, { token, expiresIn: 86400 });
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const walletAddress = req.user?.walletAddress;
  if (!walletAddress) {
    throw new AppError("UNAUTHORIZED", "User context not found", 401);
  }

  const { data, error } = await supabase.from("users").select("*").eq("wallet_address", walletAddress).single();
  if (error) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  return sendSuccess(res, 200, data);
}

export async function updateMe(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const walletAddress = req.user?.walletAddress;
  if (!walletAddress) {
    throw new AppError("UNAUTHORIZED", "User context not found", 401);
  }

  const { displayName, email } = req.body as { displayName?: string; email?: string };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (displayName !== undefined) updates.display_name = displayName;
  if (email !== undefined) updates.email = email;

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("wallet_address", walletAddress)
    .select("*")
    .single();

  if (error) {
    throw new AppError("DATABASE_ERROR", "Failed to update profile", 500, { details: error.message });
  }

  return sendSuccess(res, 200, data);
}