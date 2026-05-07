import type { Request, Response } from "express";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { InvoiceService } from "../services/InvoiceService.js";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import type { AuthenticatedRequest } from "../types/api.js";

const invoiceService = new InvoiceService();

/**
 * POST /api/invoices
 * Authenticated - merchant creates an invoice with line items.
 */
export async function createInvoice(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const payload = req.body as {
    merchantId: string;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
    dueDate?: string;
    customerInfo?: { name?: string; email?: string; wallet?: string };
    notes?: string;
  };

  // Verify merchant belongs to this user
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, wallet_address, business_wallet")
    .eq("id", payload.merchantId)
    .single();

  if (!merchant || merchant.wallet_address !== wallet) {
    throw new AppError("FORBIDDEN", "You do not own this merchant account", 403);
  }

  const invoice = await invoiceService.create({
    merchantId: payload.merchantId,
    merchantWallet: merchant.business_wallet ?? wallet,
    lineItems: payload.lineItems,
    dueDate: payload.dueDate,
    customerInfo: payload.customerInfo,
    notes: payload.notes,
  });

  logger.info({ invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, wallet }, "Invoice created");
  return sendSuccess(res, 201, invoice);
}

/**
 * GET /api/invoices
 * Authenticated - merchant lists their invoices.
 */
export async function listInvoices(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const merchantId = req.query.merchantId as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;

  if (!merchantId) {
    throw new AppError("VALIDATION_ERROR", "merchantId query parameter is required", 400);
  }

  // Verify merchant belongs to this user
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, wallet_address")
    .eq("id", merchantId)
    .single();

  if (!merchant || merchant.wallet_address !== wallet) {
    throw new AppError("FORBIDDEN", "You do not own this merchant account", 403);
  }

  const invoices = await invoiceService.listByMerchant(merchantId, limit);
  return sendSuccess(res, 200, invoices);
}

/**
 * GET /api/invoices/:id
 * Authenticated - merchant gets invoice details.
 */
export async function getInvoice(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const { id } = req.params;
  const invoice = await invoiceService.getById(id);
  if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found", 404);

  // Verify ownership through merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select("wallet_address")
    .eq("id", invoice.merchant_id)
    .single();

  if (!merchant || merchant.wallet_address !== wallet) {
    throw new AppError("FORBIDDEN", "You do not own this invoice", 403);
  }

  return sendSuccess(res, 200, invoice);
}

/**
 * GET /api/invoices/view/:invoiceNumber
 * Public - view invoice by invoice number (for customers).
 */
export async function getPublicInvoice(req: Request, res: Response): Promise<Response> {
  const { invoiceNumber } = req.params;
  const invoice = await invoiceService.getByInvoiceNumber(invoiceNumber);

  if (!invoice) {
    throw new AppError("NOT_FOUND", "Invoice not found", 404);
  }

  // Return public-safe fields
  return sendSuccess(res, 200, {
    invoiceNumber: invoice.invoice_number,
    merchantId: invoice.merchant_id,
    lineItems: invoice.line_items,
    subtotalUsdc: invoice.subtotal_usdc,
    totalUsdc: invoice.total_usdc,
    status: invoice.status,
    dueDate: invoice.due_date,
    customerName: invoice.customer_name,
    paymentLinkId: invoice.payment_link_id,
    notes: invoice.notes,
    createdAt: invoice.created_at,
  });
}

/**
 * PUT /api/invoices/:id/send
 * Authenticated - merchant marks invoice as sent.
 */
export async function sendInvoice(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const { id } = req.params;
  const invoice = await invoiceService.getById(id);
  if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found", 404);

  // Verify ownership
  const { data: merchant } = await supabase
    .from("merchants")
    .select("wallet_address")
    .eq("id", invoice.merchant_id)
    .single();

  if (!merchant || merchant.wallet_address !== wallet) {
    throw new AppError("FORBIDDEN", "You do not own this invoice", 403);
  }

  const sent = await invoiceService.markSent(id);
  if (!sent) throw new AppError("CONFLICT", "Invoice cannot be sent (must be in draft status)", 409);

  logger.info({ invoiceId: id }, "Invoice marked as sent");
  return sendSuccess(res, 200, sent);
}

/**
 * PUT /api/invoices/:id/cancel
 * Authenticated - merchant cancels an invoice.
 */
export async function cancelInvoice(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const { id } = req.params;
  const invoice = await invoiceService.getById(id);
  if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found", 404);

  // Verify ownership
  const { data: merchant } = await supabase
    .from("merchants")
    .select("wallet_address")
    .eq("id", invoice.merchant_id)
    .single();

  if (!merchant || merchant.wallet_address !== wallet) {
    throw new AppError("FORBIDDEN", "You do not own this invoice", 403);
  }

  const cancelled = await invoiceService.cancel(id);
  if (!cancelled) throw new AppError("CONFLICT", "Invoice cannot be cancelled (must be in draft or sent status)", 409);

  logger.info({ invoiceId: id }, "Invoice cancelled");
  return sendSuccess(res, 200, cancelled);
}
