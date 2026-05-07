import type { Request, Response } from "express";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { PaymentSessionService } from "../services/PaymentSessionService.js";
import { PaymentLinkService } from "../services/PaymentLinkService.js";
import { logger } from "../lib/logger.js";

const sessionService = new PaymentSessionService();
const linkService = new PaymentLinkService();

/**
 * POST /api/payment-sessions
 * Public - payer creates a session from a payment link.
 */
export async function createSession(req: Request, res: Response): Promise<Response> {
  const { paymentLinkId, payerWallet, idempotencyKey, amountUsdc: bodyAmount } = req.body as {
    paymentLinkId: string;
    payerWallet?: string;
    idempotencyKey?: string;
    amountUsdc?: number;
  };

  // Validate payment link exists and is active
  const link = await linkService.getById(paymentLinkId);
  if (!link) {
    throw new AppError("NOT_FOUND", "Payment link not found", 404);
  }
  if (!link.is_active) {
    throw new AppError("GONE", "Payment link is no longer active", 410);
  }
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    throw new AppError("GONE", "Payment link has expired", 410);
  }
  if (link.max_uses && link.use_count >= link.max_uses) {
    throw new AppError("GONE", "Payment link has reached maximum uses", 410);
  }

  const amountUsdc = link.amount_usdc ?? bodyAmount;
  if (!amountUsdc || amountUsdc <= 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Amount is required for open-amount payment links",
      400,
    );
  }

  const session = await sessionService.create({
    paymentLinkId: link.id,
    recipientWallet: link.recipient_wallet,
    amountUsdc,
    payerWallet,
    idempotencyKey,
  });

  logger.info({ sessionId: session.id, linkId: link.id }, "Payment session created");
  return sendSuccess(res, 201, session);
}

/**
 * GET /api/payment-sessions/:id
 * Public - payer polls session status.
 */
export async function getSession(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const session = await sessionService.getById(id);

  if (!session) {
    throw new AppError("NOT_FOUND", "Payment session not found", 404);
  }

  return sendSuccess(res, 200, session);
}

/**
 * PUT /api/payment-sessions/:id/pay
 * Public - payer submits tx signature after signing transaction.
 */
export async function submitPayment(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const { txSignature, payerWallet } = req.body as {
    txSignature: string;
    payerWallet: string;
  };

  // Get current session
  const session = await sessionService.getById(id);
  if (!session) {
    throw new AppError("NOT_FOUND", "Payment session not found", 404);
  }

  // Check session hasn't expired
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    throw new AppError("GONE", "Payment session has expired", 410);
  }

  // Transition: created -> paying -> confirming
  if (session.status === "created") {
    const paying = await sessionService.markPaying(id, payerWallet);
    if (!paying) {
      throw new AppError("CONFLICT", "Failed to transition session to paying state", 409);
    }
  } else if (session.status !== "paying") {
    throw new AppError(
      "CONFLICT",
      `Cannot submit payment for session in '${session.status}' status`,
      409,
    );
  }

  const confirming = await sessionService.submitTx(id, txSignature);
  if (!confirming) {
    throw new AppError("CONFLICT", "Failed to submit transaction; session may have already been processed", 409);
  }

  logger.info({ sessionId: id, txSignature, payerWallet }, "Payment transaction submitted");
  return sendSuccess(res, 200, confirming);
}
