import type { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import type { AuthenticatedRequest } from "../types/api.js";
import { logger } from "../lib/logger.js";

async function generateMerchantId(): Promise<string> {
  const { data } = await supabase.from("merchant_id_seq").insert({ prefix: "UMN" }).select("id").single();
  const seq = data?.id ?? Math.floor(Math.random() * 99999);
  return `UMN-${String(seq).padStart(5, "0")}`;
}

export async function listMerchants(req: Request, res: Response): Promise<Response> {
  const { category, search, status, limit, offset } = req.query as Record<string, string>;
  let query = supabase.from("merchants").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);
  if (search) {
    // merchant_id column may not exist if migration hasn't run
    query = query.or(`business_name.ilike.%${search}%,wallet_address.ilike.%${search}%`);
  }
  if (limit) query = query.limit(Number(limit));
  if (offset) query = query.range(Number(offset), Number(offset) + Number(limit ?? 20) - 1);

  const { data, error, count } = await query;
  if (error) {
    // If error is about unknown column, return empty to avoid crashing
    if (error.message?.includes("column") || error.code === "42703") {
      return sendSuccess(res, 200, [], { total: 0 });
    }
    throw new AppError("DATABASE_ERROR", "Failed to list merchants", 500, { details: error.message });
  }
  return sendSuccess(res, 200, data ?? [], { total: count ?? 0 });
}

export async function getMerchant(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const { data, error } = await supabase.from("merchants").select("*").eq("id", id).single();
  if (error) throw new AppError("NOT_FOUND", "Merchant not found", 404);
  return sendSuccess(res, 200, data);
}

export async function getMyMerchant(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  const { data } = await supabase.from("merchants").select("*").eq("wallet_address", wallet).order("created_at", { ascending: false }).limit(1).single();
  if (!data) return sendSuccess(res, 200, null);
  return sendSuccess(res, 200, data);
}

export async function getMyMerchants(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  const { data, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("wallet_address", wallet)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("DATABASE_ERROR", "Failed to load businesses", 500, { details: error.message });
  return sendSuccess(res, 200, data ?? []);
}

export async function registerMerchant(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const payload = req.body as {
    businessName: string;
    businessType?: string;
    category: string;
    businessWallet: string;
    description?: string;
    country?: string;
    city?: string;
    website?: string;
    contactEmail?: string;
    contactPhone?: string;
  };

  if (!payload.businessWallet || payload.businessWallet.length < 32) {
    throw new AppError("VALIDATION_ERROR", "A valid Solana wallet address is required for this business", 400);
  }

  // Prevent duplicate business name for the same owner
  const { data: existingName } = await supabase
    .from("merchants")
    .select("id, business_name, status")
    .eq("wallet_address", wallet)
    .eq("business_name", payload.businessName)
    .in("status", ["pending", "approved"]);

  if (existingName && existingName.length > 0) {
    throw new AppError("CONFLICT", `You already have a business named "${payload.businessName}" that is ${existingName[0].status}`, 409);
  }

  // Prevent duplicate business wallet across all merchants
  const { data: existingWallet } = await supabase
    .from("merchants")
    .select("id, business_name")
    .eq("business_wallet", payload.businessWallet)
    .in("status", ["pending", "approved"]);

  if (existingWallet && existingWallet.length > 0) {
    throw new AppError("CONFLICT", `This wallet address is already used by business "${existingWallet[0].business_name}"`, 409);
  }

  const merchantId = await generateMerchantId();

  const { data, error } = await supabase
    .from("merchants")
    .insert({
      merchant_id: merchantId,
      wallet_address: wallet,
      business_wallet: payload.businessWallet,
      business_name: payload.businessName,
      business_type: payload.businessType ?? null,
      category: payload.category,
      description: payload.description ?? null,
      country: payload.country ?? null,
      city: payload.city ?? null,
      website: payload.website ?? null,
      contact_email: payload.contactEmail ?? null,
      contact_phone: payload.contactPhone ?? null,
    })
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to register merchant", 500, { details: error.message });

  logger.info({ merchantId, wallet, businessName: payload.businessName }, "New merchant application submitted");
  return sendSuccess(res, 201, data);
}

export async function approveMerchant(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { id } = req.params;
  const adminWallet = req.user?.walletAddress;

  const { data: merchant, error: fetchErr } = await supabase.from("merchants").select("*").eq("id", id).single();
  if (fetchErr || !merchant) throw new AppError("NOT_FOUND", "Merchant not found", 404);
  if (merchant.status === "approved") throw new AppError("CONFLICT", "Merchant is already approved", 409);

  const { data, error } = await supabase
    .from("merchants")
    .update({
      status: "approved",
      approved_by: adminWallet,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to approve merchant", 500, { details: error.message });

  // Upgrade user role to merchant
  await supabase.from("users").update({ role: "merchant" }).eq("wallet_address", merchant.wallet_address);

  logger.info({ merchantId: merchant.merchant_id, approvedBy: adminWallet }, "Merchant approved");
  return sendSuccess(res, 200, data);
}

export async function rejectMerchant(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };

  const { data, error } = await supabase
    .from("merchants")
    .update({
      status: "rejected",
      rejection_reason: reason ?? "Application rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to reject merchant", 500, { details: error.message });
  return sendSuccess(res, 200, data);
}

export async function suspendMerchant(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };

  const { data: merchant } = await supabase.from("merchants").select("wallet_address").eq("id", id).single();

  const { data, error } = await supabase
    .from("merchants")
    .update({
      status: "suspended",
      rejection_reason: reason ?? "Account suspended",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to suspend merchant", 500, { details: error.message });

  if (merchant) {
    await supabase.from("users").update({ role: "user" }).eq("wallet_address", merchant.wallet_address);
  }

  return sendSuccess(res, 200, data);
}

export async function updateMerchant(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  const { id } = req.params;

  const { data: merchant } = await supabase.from("merchants").select("wallet_address").eq("id", id).single();
  if (!merchant || merchant.wallet_address !== wallet) {
    throw new AppError("FORBIDDEN", "You can only edit your own merchant profile", 403);
  }

  const allowed = ["business_name", "business_type", "business_wallet", "description", "country", "city", "website", "contact_email", "contact_phone"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (req.body[camelKey] !== undefined) updates[key] = req.body[camelKey];
  }

  const { data, error } = await supabase.from("merchants").update(updates).eq("id", id).select("*").single();
  if (error) throw new AppError("DATABASE_ERROR", "Failed to update merchant", 500, { details: error.message });
  return sendSuccess(res, 200, data);
}
