import type { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";

export async function analyticsOverview(_req: Request, res: Response): Promise<Response> {
  const [{ count: totalVaults }, { data: volumeRows }, { count: users }, { count: releases }] = await Promise.all([
    supabase.from("vaults").select("id", { count: "exact", head: true }),
    supabase.from("vaults").select("amount_usdc,released_amount_usdc"),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("tx_type", "release"),
  ]);

  const totalVolume = (volumeRows ?? []).reduce((sum, row) => sum + Number(row.amount_usdc), 0);
  const totalReleased = (volumeRows ?? []).reduce((sum, row) => sum + Number(row.released_amount_usdc), 0);
  const successRate = totalVolume > 0 ? (totalReleased / totalVolume) * 100 : 0;

  return sendSuccess(res, 200, {
    totalVaults: totalVaults ?? 0,
    totalVolumeUsdc: totalVolume,
    totalUsers: users ?? 0,
    totalReleases: releases ?? 0,
    successRate,
  });
}

export async function analyticsDaily(_req: Request, res: Response): Promise<Response> {
  const { data, error } = await supabase.from("analytics_daily").select("*").order("date", { ascending: true });
  if (error) throw new AppError("DATABASE_ERROR", "Failed to fetch daily analytics", 500, { details: error.message });
  return sendSuccess(res, 200, data ?? []);
}

export async function analyticsUser(req: Request, res: Response): Promise<Response> {
  const { wallet } = req.params;

  const [{ data: created }, { data: received }, { data: disputes }] = await Promise.all([
    supabase.from("vaults").select("amount_usdc,released_amount_usdc,status").eq("creator_wallet", wallet),
    supabase.from("vaults").select("amount_usdc,released_amount_usdc,status").eq("recipient_wallet", wallet),
    supabase.from("disputes").select("id,status").or(`plaintiff_wallet.eq.${wallet},defendant_wallet.eq.${wallet}`),
  ]);

  const totalCreatedVolume = (created ?? []).reduce((sum, row) => sum + Number(row.amount_usdc), 0);
  const totalReceivedVolume = (received ?? []).reduce((sum, row) => sum + Number(row.released_amount_usdc), 0);

  return sendSuccess(res, 200, {
    wallet,
    totalVaultsCreated: created?.length ?? 0,
    totalVaultsReceiving: received?.length ?? 0,
    totalCreatedVolume,
    totalReceivedVolume,
    disputes: disputes?.length ?? 0,
  });
}