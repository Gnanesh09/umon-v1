import type { Response } from "express";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import type { AuthenticatedRequest } from "../types/api.js";

export async function listNotifications(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("wallet_address", wallet)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new AppError("DATABASE_ERROR", "Failed to fetch notifications", 500, { details: error.message });
  return sendSuccess(res, 200, data ?? []);
}

export async function markNotificationRead(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const { id } = req.params;
  const wallet = req.user?.walletAddress;

  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("wallet_address", wallet)
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to mark notification", 500, { details: error.message });
  return sendSuccess(res, 200, data);
}

export async function markAllNotificationsRead(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;

  const { error } = await supabase.from("notifications").update({ read: true }).eq("wallet_address", wallet).eq("read", false);
  if (error) throw new AppError("DATABASE_ERROR", "Failed to mark all notifications", 500, { details: error.message });
  return sendSuccess(res, 200, { updated: true });
}