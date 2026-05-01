import { Router } from "express";
import type { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";
import { sendSuccess } from "../utils/response.js";
import { AppError } from "../utils/errors.js";

export const transactionRouter = Router();

transactionRouter.get("/", async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 200);

  let query = supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await query;
  if (error) throw new AppError("DATABASE_ERROR", "Failed to fetch transactions", 500, { details: error.message });

  return sendSuccess(res, 200, data ?? []);
});
