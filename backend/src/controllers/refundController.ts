import type { Response } from "express";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { RefundService } from "../services/RefundService.js";
import { PaymentSessionService } from "../services/PaymentSessionService.js";
import { logger } from "../lib/logger.js";
import type { AuthenticatedRequest } from "../types/api.js";

const refundService = new RefundService();
const sessionService = new PaymentSessionService();

/**
 * POST /api/refunds
 * Authenticated - merchant creates a manual refund record.
 */
export async function createRefund(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const { sessionId, amountUsdc, reason } = req.body as {
    sessionId: string;
    amountUsdc: number;
    reason?: string;
  };

  // Validate the session exists and belongs to this merchant
  const session = await sessionService.getById(sessionId);
  if (!session) {
    throw new AppError("NOT_FOUND", "Payment session not found", 404);
  }

  if (session.recipient_wallet !== wallet) {
    throw new AppError("FORBIDDEN", "You are not the recipient of this payment session", 403);
  }

  if (session.status !== "completed") {
    throw new AppError(
      "CONFLICT",
      `Cannot refund a session in '${session.status}' status; only completed sessions can be refunded`,
      409,
    );
  }

  if (!session.payer_wallet) {
    throw new AppError("CONFLICT", "Session has no payer wallet to refund to", 409);
  }

  const refund = await refundService.create({
    sessionId,
    merchantWallet: wallet,
    payerWallet: session.payer_wallet,
    amountUsdc: amountUsdc ?? session.amount_usdc,
    reason,
  });

  logger.info({ refundId: refund.id, sessionId, wallet }, "Refund record created");
  return sendSuccess(res, 201, refund);
}

/**
 * GET /api/refunds
 * Authenticated - merchant lists their refunds.
 */
export async function listRefunds(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const refunds = await refundService.listByMerchant(wallet, limit);

  return sendSuccess(res, 200, refunds);
}
