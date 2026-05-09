import type { Request, Response } from "express";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { PaymentLinkService } from "../services/PaymentLinkService.js";
import { PaymentSessionService } from "../services/PaymentSessionService.js";
import { logger } from "../lib/logger.js";
import type { AuthenticatedRequest } from "../types/api.js";

const paymentLinkService = new PaymentLinkService();
const sessionService = new PaymentSessionService();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export async function createPaymentLink(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const payload = req.body as {
    ownerType?: "merchant" | "user";
    recipientWallet: string;
    merchantId?: string;
    amountUsdc?: number;
    title: string;
    description?: string;
    conditions?: unknown[];
    maxUses?: number;
    expiresAt?: string;
  };

  const link = await paymentLinkService.create({
    ownerType: payload.ownerType ?? "user",
    ownerWallet: wallet,
    merchantId: payload.merchantId,
    recipientWallet: payload.recipientWallet,
    amountUsdc: payload.amountUsdc,
    title: payload.title,
    description: payload.description,
    conditions: payload.conditions,
    maxUses: payload.maxUses,
    expiresAt: payload.expiresAt,
  });

  const paymentUrl = `${FRONTEND_URL}/pay/${link.short_code}`;

  logger.info({ linkId: link.id, shortCode: link.short_code, wallet }, "Payment link created");

  return sendSuccess(res, 201, { ...link, paymentUrl });
}

export async function listMyPaymentLinks(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const links = await paymentLinkService.listByOwner(wallet, limit);

  return sendSuccess(res, 200, links);
}

export async function getPaymentLinkDetail(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const { id } = req.params;
  const link = await paymentLinkService.getById(id);
  if (!link) throw new AppError("NOT_FOUND", "Payment link not found", 404);

  // Only owner can see full details
  if (link.owner_wallet !== wallet) {
    throw new AppError("FORBIDDEN", "You can only view your own payment links", 403);
  }

  const paymentUrl = `${FRONTEND_URL}/pay/${link.short_code}`;
  return sendSuccess(res, 200, { ...link, paymentUrl });
}

export async function resolveShortCode(req: Request, res: Response): Promise<Response> {
  const { shortCode } = req.params;
  const link = await paymentLinkService.getByShortCode(shortCode);

  if (!link) {
    throw new AppError("NOT_FOUND", "Payment link not found or expired", 404);
  }

  // Return public-safe fields only
  return sendSuccess(res, 200, {
    id: link.id,
    shortCode: link.short_code,
    recipientWallet: link.recipient_wallet,
    amountUsdc: link.amount_usdc,
    title: link.title,
    description: link.description,
    conditions: link.conditions,
    ownerType: link.owner_type,
    merchantId: link.merchant_id,
  });
}

export async function updatePaymentLink(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const { id } = req.params;
  const payload = req.body as {
    title?: string;
    description?: string;
    amountUsdc?: number;
    recipientWallet?: string;
    maxUses?: number;
    expiresAt?: string;
  };

  const updated = await paymentLinkService.update(id, wallet, payload);
  if (!updated) throw new AppError("NOT_FOUND", "Payment link not found or not yours", 404);

  return sendSuccess(res, 200, updated);
}

export async function deactivatePaymentLink(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const { id } = req.params;
  const deactivated = await paymentLinkService.deactivate(id, wallet);
  if (!deactivated) throw new AppError("NOT_FOUND", "Payment link not found or not yours", 404);

  return sendSuccess(res, 200, deactivated);
}

export async function getPaymentLinkCollections(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const links = await paymentLinkService.listByOwner(wallet, 200);
  if (links.length === 0) {
    return sendSuccess(res, 200, { links: [], sessions: [], totals: { totalCollected: 0, totalSessions: 0, completedSessions: 0 } });
  }

  const linkIds = links.map((l) => l.id);
  const sessions = await sessionService.listByPaymentLinkIds(linkIds);

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const totalCollected = completedSessions.reduce((sum, s) => sum + Number(s.amount_usdc ?? 0), 0);

  const perLink: Record<string, { collected: number; sessionCount: number; completedCount: number }> = {};
  for (const link of links) {
    perLink[link.id] = { collected: 0, sessionCount: 0, completedCount: 0 };
  }
  for (const s of sessions) {
    if (!s.payment_link_id || !perLink[s.payment_link_id]) continue;
    perLink[s.payment_link_id].sessionCount++;
    if (s.status === "completed") {
      perLink[s.payment_link_id].completedCount++;
      perLink[s.payment_link_id].collected += Number(s.amount_usdc ?? 0);
    }
  }

  return sendSuccess(res, 200, {
    links: links.map((l) => ({
      ...l,
      _collected: perLink[l.id]?.collected ?? 0,
      _sessionCount: perLink[l.id]?.sessionCount ?? 0,
      _completedCount: perLink[l.id]?.completedCount ?? 0,
    })),
    sessions: sessions.slice(0, 100),
    totals: {
      totalCollected,
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
    },
  });
}
