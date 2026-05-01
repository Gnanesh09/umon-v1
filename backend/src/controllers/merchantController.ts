import type { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";

export async function listMerchants(req: Request, res: Response): Promise<Response> {
  const { category, search } = req.query as Record<string, string>;
  let query = supabase.from("merchants").select("*").order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (search) query = query.or(`business_name.ilike.%${search}%,wallet_address.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) throw new AppError("DATABASE_ERROR", "Failed to list merchants", 500, { details: error.message });
  return sendSuccess(res, 200, data ?? []);
}

export async function createMerchant(req: Request, res: Response): Promise<Response> {
  const payload = req.body;
  const { data, error } = await supabase
    .from("merchants")
    .insert({
      wallet_address: payload.walletAddress,
      business_name: payload.businessName,
      category: payload.category,
      country: payload.country,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new AppError("CONFLICT", "Merchant already exists", 409);
    throw new AppError("DATABASE_ERROR", "Failed to create merchant", 500, { details: error.message });
  }

  return sendSuccess(res, 201, data);
}

export async function verifyMerchant(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const { verified } = req.body as { verified: boolean };

  const { data, error } = await supabase
    .from("merchants")
    .update({ verified, on_chain_registered: verified })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to verify merchant", 500, { details: error.message });
  return sendSuccess(res, 200, data);
}