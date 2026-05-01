import { Router, type Request, type Response } from "express";
import { supabase } from "../lib/supabase.js";
import { sendSuccess } from "../utils/response.js";
import { AppError } from "../utils/errors.js";
import { ReceiptService } from "../services/ReceiptService.js";
import { authenticate } from "../middleware/authenticate.js";
import type { AuthenticatedRequest } from "../types/api.js";

export const feeRouter = Router();
const receiptService = new ReceiptService();

feeRouter.get("/", async (req: Request, res: Response) => {
  const { wallet, limit } = req.query as Record<string, string>;
  let query = supabase
    .from("fees")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Number(limit ?? 50));
  if (wallet) query = query.eq("payer_wallet", wallet);
  const { data, error } = await query;
  if (error) throw new AppError("DATABASE_ERROR", "Failed to fetch fees", 500);
  return sendSuccess(res, 200, data ?? []);
});

feeRouter.get("/summary", async (req: Request, res: Response) => {
  const { wallet } = req.query as Record<string, string>;
  let query = supabase.from("fees").select("amount_usdc");
  if (wallet) query = query.eq("payer_wallet", wallet);
  const { data } = await query;
  const rows = data ?? [];
  const totalFees = rows.reduce((s, r) => s + Number(r.amount_usdc), 0);
  const totalTransactions = rows.length;
  return sendSuccess(res, 200, { totalFees, totalTransactions });
});

feeRouter.get("/receipts", async (req: Request, res: Response) => {
  const { wallet } = req.query as Record<string, string>;
  if (!wallet) throw new AppError("VALIDATION_ERROR", "wallet query param required", 400);
  const receipts = await receiptService.listByWallet(wallet);
  return sendSuccess(res, 200, receipts);
});

feeRouter.get("/receipts/:txSignature", async (req: Request, res: Response) => {
  const receipt = await receiptService.getByTx(req.params.txSignature);
  if (!receipt) throw new AppError("NOT_FOUND", "Receipt not found", 404);
  return sendSuccess(res, 200, receipt);
});

feeRouter.get("/receipts/:txSignature/html", async (req: Request, res: Response) => {
  const receipt = await receiptService.getByTx(req.params.txSignature);
  if (!receipt) throw new AppError("NOT_FOUND", "Receipt not found", 404);
  const html = receiptService.renderReceiptHtml(receipt);
  res.setHeader("Content-Type", "text/html");
  return res.send(html);
});

feeRouter.post("/receipts/:id/email", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const sent = await receiptService.emailReceipt(req.params.id);
  if (!sent) throw new AppError("UNPROCESSABLE_ENTITY", "Failed to send email. Ensure your email is set in Settings.", 422);
  return sendSuccess(res, 200, { emailed: true });
});
