import type { Response } from "express";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import type { AuthenticatedRequest } from "../types/api.js";

export async function getAdminStats(_req: AuthenticatedRequest, res: Response): Promise<Response> {
  const [
    { count: totalUsers },
    { count: totalMerchants },
    { count: pendingMerchants },
    { count: totalVaults },
    { data: feeRows },
    { count: activeVaults },
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("merchants").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("merchants").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("vaults").select("id", { count: "exact", head: true }),
    supabase.from("fees").select("amount_usdc"),
    supabase.from("vaults").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const totalFeesCollected = (feeRows ?? []).reduce((sum, r) => sum + Number(r.amount_usdc), 0);

  return sendSuccess(res, 200, {
    totalUsers: totalUsers ?? 0,
    totalMerchants: totalMerchants ?? 0,
    pendingMerchants: pendingMerchants ?? 0,
    totalVaults: totalVaults ?? 0,
    activeVaults: activeVaults ?? 0,
    totalFeesCollected,
  });
}

export async function listUsers(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { search, role, limit, offset } = req.query as Record<string, string>;
  let query = supabase.from("users").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (role) query = query.eq("role", role);
  if (search) query = query.or(`wallet_address.ilike.%${search}%,display_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (limit) query = query.limit(Number(limit));
  if (offset) query = query.range(Number(offset), Number(offset) + Number(limit ?? 20) - 1);

  const { data, error, count } = await query;
  if (error) throw new AppError("DATABASE_ERROR", "Failed to list users", 500, { details: error.message });
  return sendSuccess(res, 200, data ?? [], { total: count ?? 0 });
}

export async function updateUserRole(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { id } = req.params;
  const { role } = req.body as { role: string };

  if (!["user", "merchant", "admin"].includes(role)) {
    throw new AppError("VALIDATION_ERROR", "Invalid role", 400);
  }

  const { data, error } = await supabase
    .from("users")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to update user role", 500, { details: error.message });
  return sendSuccess(res, 200, data);
}

export async function listAllFees(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { limit, offset, wallet } = req.query as Record<string, string>;
  let query = supabase.from("fees").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (wallet) query = query.eq("payer_wallet", wallet);
  if (limit) query = query.limit(Number(limit));
  if (offset) query = query.range(Number(offset), Number(offset) + Number(limit ?? 50) - 1);

  const { data, error, count } = await query;
  if (error) throw new AppError("DATABASE_ERROR", "Failed to list fees", 500, { details: error.message });
  return sendSuccess(res, 200, data ?? [], { total: count ?? 0 });
}

export async function getRecentActivity(_req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return sendSuccess(res, 200, data ?? []);
}

export async function getAdminNotifications(_req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("wallet_address", "ADMIN")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new AppError("DATABASE_ERROR", "Failed to fetch admin notifications", 500, { details: error.message });
  return sendSuccess(res, 200, data ?? []);
}

export async function markAdminNotificationRead(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("wallet_address", "ADMIN")
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to update notification", 500, { details: error.message });
  return sendSuccess(res, 200, data);
}
