import type { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { ReceiptService } from "../services/ReceiptService.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import type { AuthenticatedRequest } from "../types/api.js";

const receiptService = new ReceiptService();

function decodeCursor(cursor?: string): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, "base64").toString("utf8");
    return JSON.parse(raw) as { createdAt: string; id: string };
  } catch {
    return null;
  }
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt, id }), "utf8").toString("base64");
}

export async function listVaults(req: Request, res: Response): Promise<Response> {
  const { creator, recipient, status, limit, cursor, sortBy, sortOrder } = req.query as Record<string, string>;
  const pageSize = Number(limit ?? 20);

  let query = supabase
    .from("vaults")
    .select("*", { count: "exact" })
    .order(sortBy === "amount" ? "amount_usdc" : "created_at", { ascending: sortOrder === "asc" })
    .limit(pageSize + 1);

  if (creator) query = query.eq("creator_wallet", creator);
  if (recipient) query = query.eq("recipient_wallet", recipient);
  if (status) query = query.eq("status", status);

  const decoded = decodeCursor(cursor);
  if (decoded) {
    query = query.lt("created_at", decoded.createdAt);
  }

  const { data, error, count } = await query;
  if (error) throw new AppError("DATABASE_ERROR", "Failed to fetch vaults", 500, { details: error.message });

  const hasMore = (data?.length ?? 0) > pageSize;
  const rows = (data ?? []).slice(0, pageSize);
  const next = hasMore && rows.length > 0 ? encodeCursor(rows[rows.length - 1].created_at, rows[rows.length - 1].id) : undefined;

  return sendSuccess(res, 200, rows, {
    limit: pageSize,
    total: count ?? 0,
    cursor: next,
    hasMore,
  });
}

export async function createVault(req: Request, res: Response): Promise<Response> {
  const payload = req.body;

  const { data, error } = await supabase
    .from("vaults")
    .insert({
      on_chain_id: payload.onChainId,
      creator_wallet: payload.creatorWallet,
      recipient_wallet: payload.recipientWallet,
      amount_usdc: payload.amountUsdc,
      released_amount_usdc: payload.releasedAmountUsdc,
      status: payload.status,
      description: payload.description,
      conditions: payload.conditions,
      tx_signature: payload.txSignature,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new AppError("CONFLICT", "Vault already exists", 409);
    throw new AppError("DATABASE_ERROR", "Failed to create vault", 500, { details: error.message });
  }

  const feeAmountUsdc = Number(payload.feeAmountUsdc ?? 0);
  if (feeAmountUsdc > 0 && data) {
    await supabase.from("fees").insert({
      vault_id: data.id,
      payer_wallet: payload.creatorWallet,
      amount_usdc: feeAmountUsdc,
      fee_percentage: env.FEE_PERCENTAGE,
      vault_amount_usdc: payload.amountUsdc,
      tx_signature: payload.txSignature,
    }).then(({ error: feeErr }) => {
      if (feeErr) logger.error({ err: feeErr }, "Failed to record fee");
    });

    receiptService.create({
      vaultId: data.id,
      walletAddress: payload.creatorWallet,
      txSignature: payload.txSignature,
      receiptType: "vault_created",
      amountUsdc: payload.amountUsdc,
      feeUsdc: feeAmountUsdc,
      recipientWallet: payload.recipientWallet,
      description: payload.description,
    }).catch((e) => logger.error({ err: e }, "Failed to create receipt"));
  }

  return sendSuccess(res, 201, data);
}

export async function getVault(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const { data, error } = await supabase.from("vaults").select("*").eq("id", id).single();

  if (error) throw new AppError("NOT_FOUND", "Vault not found", 404);
  return sendSuccess(res, 200, data);
}

export async function getVaultTransactions(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("vault_id", id)
    .order("created_at", { ascending: false });

  if (error) throw new AppError("DATABASE_ERROR", "Failed to fetch transactions", 500, { details: error.message });
  return sendSuccess(res, 200, data ?? []);
}

export async function cancelVault(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { id } = req.params;
  const wallet = req.user?.walletAddress;

  const { data: vault, error: vaultError } = await supabase.from("vaults").select("*").eq("id", id).single();
  if (vaultError || !vault) throw new AppError("NOT_FOUND", "Vault not found", 404);

  if (vault.creator_wallet !== wallet) throw new AppError("FORBIDDEN", "Only creator can cancel", 403);
  if (Number(vault.released_amount_usdc) > 0) throw new AppError("UNPROCESSABLE_ENTITY", "Vault already released", 422);

  const { data, error } = await supabase
    .from("vaults")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to cancel vault", 500, { details: error.message });
  return sendSuccess(res, 200, data);
}

export async function approveMilestone(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { id } = req.params;
  const wallet = req.user?.walletAddress;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      vault_id: id,
      tx_signature: req.body.txSignature ?? `pending-${Date.now()}`,
      tx_type: "milestone_approve",
      from_wallet: wallet,
      metadata: req.body,
    })
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to save milestone approval", 500, { details: error.message });
  return sendSuccess(res, 201, data);
}

export async function recordAction(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const { txSignature, txType, conditionType, conditionIndex, releaseAmountUsdc } = req.body as {
    txSignature: string;
    txType: string;
    conditionType?: string;
    conditionIndex?: number;
    releaseAmountUsdc?: number;
  };

  const { data: vault, error: vaultError } = await supabase.from("vaults").select("*").eq("id", id).single();
  if (vaultError || !vault) throw new AppError("NOT_FOUND", "Vault not found", 404);

  const { error: txError } = await supabase.from("transactions").insert({
    vault_id: id,
    tx_signature: txSignature,
    tx_type: txType,
    amount_usdc: releaseAmountUsdc ?? null,
    from_wallet: vault.on_chain_id,
    to_wallet: vault.recipient_wallet,
    condition_type: conditionType ?? null,
    metadata: { conditionIndex },
  });
  if (txError && txError.code !== "23505") {
    throw new AppError("DATABASE_ERROR", "Failed to record transaction", 500, { details: txError.message });
  }

  const releaseAmount = releaseAmountUsdc ?? 0;
  if (releaseAmount > 0 || txType === "cancel" || txType === "dispute") {
    const newReleased = Math.min(
      Number(vault.released_amount_usdc) + releaseAmount,
      Number(vault.amount_usdc),
    );
    let newStatus = vault.status;
    if (txType === "cancel") {
      newStatus = "cancelled";
    } else if (newReleased >= Number(vault.amount_usdc)) {
      newStatus = "released";
    } else if (newReleased > 0) {
      newStatus = "partially_released";
    }
    if (txType === "dispute") {
      newStatus = "disputed";
    }

    await supabase
      .from("vaults")
      .update({
        released_amount_usdc: newReleased,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  const receiptTypeMap: Record<string, string> = {
    release: "funds_released",
    milestone_approve: "milestone_approved",
    split: "split_executed",
    cancel: "vault_cancelled",
    dispute: "dispute_raised",
  };
  const receiptType = receiptTypeMap[txType];
  if (receiptType) {
    receiptService.create({
      vaultId: id,
      walletAddress: vault.creator_wallet,
      txSignature,
      receiptType,
      amountUsdc: releaseAmountUsdc ?? Number(vault.amount_usdc),
      recipientWallet: vault.recipient_wallet,
      description: vault.description,
      metadata: { conditionType, conditionIndex },
    }).catch((e) => logger.error({ err: e }, "Failed to create action receipt"));
  }

  const { data: updated } = await supabase.from("vaults").select("*").eq("id", id).single();
  return sendSuccess(res, 200, updated);
}

export async function raiseDispute(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { id } = req.params;
  const wallet = req.user?.walletAddress;
  const reason = req.body.reason as string;

  const { data: vault, error: vaultError } = await supabase.from("vaults").select("*").eq("id", id).single();
  if (vaultError || !vault) throw new AppError("NOT_FOUND", "Vault not found", 404);

  const defendant = vault.creator_wallet === wallet ? vault.recipient_wallet : vault.creator_wallet;

  const { data, error } = await supabase
    .from("disputes")
    .insert({
      vault_id: id,
      plaintiff_wallet: wallet,
      defendant_wallet: defendant,
      reason,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "open",
    })
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to create dispute", 500, { details: error.message });

  await supabase.from("vaults").update({ status: "disputed", updated_at: new Date().toISOString() }).eq("id", id);

  return sendSuccess(res, 201, data);
}