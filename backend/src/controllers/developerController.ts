import type { Response } from "express";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { ApiKeyService } from "../services/ApiKeyService.js";
import { WebhookService } from "../services/WebhookService.js";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import type { AuthenticatedRequest } from "../types/api.js";

const apiKeyService = new ApiKeyService();
const webhookService = new WebhookService();

async function getMerchantForWallet(wallet: string, merchantId: string) {
  const { data } = await supabase
    .from("merchants")
    .select("id, wallet_address")
    .eq("id", merchantId)
    .single();

  if (!data || data.wallet_address !== wallet) return null;
  return data;
}

// ── API KEYS ──

export async function createApiKey(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const { merchantId, label } = req.body as { merchantId: string; label?: string };
  const merchant = await getMerchantForWallet(wallet, merchantId);
  if (!merchant) throw new AppError("FORBIDDEN", "You do not own this merchant account", 403);

  const key = await apiKeyService.create(merchantId, label ?? "Default");
  logger.info({ keyId: key.id, merchantId, wallet }, "API key created");

  return sendSuccess(res, 201, key);
}

export async function listApiKeys(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const merchantId = req.query.merchantId as string;
  if (!merchantId) throw new AppError("VALIDATION_ERROR", "merchantId is required", 400);

  const merchant = await getMerchantForWallet(wallet, merchantId);
  if (!merchant) throw new AppError("FORBIDDEN", "You do not own this merchant account", 403);

  const keys = await apiKeyService.listByMerchant(merchantId);
  return sendSuccess(res, 200, keys);
}

export async function revokeApiKey(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const { id } = req.params;
  const { merchantId } = req.body as { merchantId: string };
  const merchant = await getMerchantForWallet(wallet, merchantId);
  if (!merchant) throw new AppError("FORBIDDEN", "You do not own this merchant account", 403);

  const revoked = await apiKeyService.revoke(id, merchantId);
  if (!revoked) throw new AppError("NOT_FOUND", "API key not found", 404);

  logger.info({ keyId: id, merchantId, wallet }, "API key revoked");
  return sendSuccess(res, 200, revoked);
}

// ── WEBHOOKS ──

export async function createWebhook(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const { merchantId, url, events } = req.body as {
    merchantId: string;
    url: string;
    events: string[];
  };

  const merchant = await getMerchantForWallet(wallet, merchantId);
  if (!merchant) throw new AppError("FORBIDDEN", "You do not own this merchant account", 403);

  const webhook = await webhookService.create({ merchantId, url, events });
  logger.info({ webhookId: webhook.id, merchantId, wallet }, "Webhook created");

  return sendSuccess(res, 201, webhook);
}

export async function listWebhooks(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const merchantId = req.query.merchantId as string;
  if (!merchantId) throw new AppError("VALIDATION_ERROR", "merchantId is required", 400);

  const merchant = await getMerchantForWallet(wallet, merchantId);
  if (!merchant) throw new AppError("FORBIDDEN", "You do not own this merchant account", 403);

  const webhooks = await webhookService.listByMerchant(merchantId);
  return sendSuccess(res, 200, webhooks);
}

export async function deleteWebhook(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const { id } = req.params;
  const { merchantId } = req.body as { merchantId: string };
  const merchant = await getMerchantForWallet(wallet, merchantId);
  if (!merchant) throw new AppError("FORBIDDEN", "You do not own this merchant account", 403);

  const deleted = await webhookService.delete(id, merchantId);
  if (!deleted) throw new AppError("NOT_FOUND", "Webhook not found", 404);

  logger.info({ webhookId: id, merchantId, wallet }, "Webhook deleted");
  return sendSuccess(res, 200, { deleted: true });
}
