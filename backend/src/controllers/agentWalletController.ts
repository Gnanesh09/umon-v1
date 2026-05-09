import type { Request, Response } from "express";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { AgentWalletService } from "../services/AgentWalletService.js";
import { logger } from "../lib/logger.js";
import type { AuthenticatedRequest } from "../types/api.js";

const agentService = new AgentWalletService();

// ─── Owner-authenticated endpoints ─────────────────────────────────

export async function createAgentWallet(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const { name, description, dailyLimitUsdc, perTxLimitUsdc, allowedCategories, allowedRecipients } =
    req.body as {
      name: string;
      description?: string;
      dailyLimitUsdc?: number;
      perTxLimitUsdc?: number;
      allowedCategories?: string[];
      allowedRecipients?: string[];
    };

  const result = await agentService.create({
    ownerWallet: wallet,
    name,
    description,
    dailyLimitUsdc,
    perTxLimitUsdc,
    allowedCategories,
    allowedRecipients,
  });

  logger.info({ agentId: result.wallet.id, owner: wallet }, "Agent wallet created via API");

  return sendSuccess(res, 201, {
    wallet: sanitizeWallet(result.wallet),
    apiToken: result.apiToken,
  });
}

export async function listAgentWallets(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const wallets = await agentService.listByOwner(wallet);
  const withBalances = await Promise.all(
    wallets.map(async (w) => {
      const balance = await agentService.getBalance(w.public_key);
      return { ...sanitizeWallet(w), balance };
    }),
  );

  return sendSuccess(res, 200, withBalances);
}

export async function getAgentWallet(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const agent = await agentService.getById(req.params.id);
  if (!agent || agent.owner_wallet !== wallet) {
    throw new AppError("NOT_FOUND", "Agent wallet not found", 404);
  }

  const balance = await agentService.getBalance(agent.public_key);
  const transactions = await agentService.listTransactions(agent.id, 50);

  return sendSuccess(res, 200, {
    ...sanitizeWallet(agent),
    balance,
    transactions,
  });
}

export async function agentPay(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const agent = await agentService.getById(req.params.id);
  if (!agent || agent.owner_wallet !== wallet) {
    throw new AppError("NOT_FOUND", "Agent wallet not found", 404);
  }

  const { toWallet, amountUsdc, memo } = req.body as {
    toWallet: string;
    amountUsdc: number;
    memo?: string;
  };

  const result = await agentService.pay({
    agentWalletId: agent.id,
    toWallet,
    amountUsdc,
    memo,
  });

  return sendSuccess(res, 200, result);
}

export async function freezeAgent(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const result = await agentService.freeze(req.params.id, wallet);
  if (!result) throw new AppError("NOT_FOUND", "Agent wallet not found", 404);

  return sendSuccess(res, 200, sanitizeWallet(result));
}

export async function unfreezeAgent(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const result = await agentService.unfreeze(req.params.id, wallet);
  if (!result) throw new AppError("NOT_FOUND", "Agent wallet not found", 404);

  return sendSuccess(res, 200, sanitizeWallet(result));
}

export async function revokeAgent(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const result = await agentService.revoke(req.params.id, wallet);
  if (!result) throw new AppError("NOT_FOUND", "Agent wallet not found", 404);

  return sendSuccess(res, 200, sanitizeWallet(result));
}

export async function updateAgentLimits(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const result = await agentService.updateLimits(req.params.id, wallet, req.body);
  if (!result) throw new AppError("NOT_FOUND", "Agent wallet not found", 404);

  return sendSuccess(res, 200, sanitizeWallet(result));
}

export async function regenerateAgentToken(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const token = await agentService.regenerateToken(req.params.id, wallet);
  return sendSuccess(res, 200, { apiToken: token });
}

export async function getAgentTransactions(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const wallet = req.user?.walletAddress;
  if (!wallet) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);

  const agent = await agentService.getById(req.params.id);
  if (!agent || agent.owner_wallet !== wallet) {
    throw new AppError("NOT_FOUND", "Agent wallet not found", 404);
  }

  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const transactions = await agentService.listTransactions(agent.id, limit);

  return sendSuccess(res, 200, transactions);
}

// ─── Agent-token-authenticated endpoints (for MCP / SDK) ───────────

export async function agentPayByToken(req: Request, res: Response): Promise<Response> {
  const token = extractBearerToken(req);
  if (!token) throw new AppError("UNAUTHORIZED", "Missing agent API token", 401);

  const agent = await agentService.getByApiToken(token);
  if (!agent) throw new AppError("UNAUTHORIZED", "Invalid or expired agent token", 401);
  if (agent.status !== "active") {
    throw new AppError("FORBIDDEN", `Agent wallet is ${agent.status}`, 403);
  }

  const { toWallet, amountUsdc, memo } = req.body as {
    toWallet: string;
    amountUsdc: number;
    memo?: string;
  };

  const result = await agentService.pay({
    agentWalletId: agent.id,
    toWallet,
    amountUsdc,
    memo,
  });

  return sendSuccess(res, 200, result);
}

export async function agentBalanceByToken(req: Request, res: Response): Promise<Response> {
  const token = extractBearerToken(req);
  if (!token) throw new AppError("UNAUTHORIZED", "Missing agent API token", 401);

  const agent = await agentService.getByApiToken(token);
  if (!agent) throw new AppError("UNAUTHORIZED", "Invalid or expired agent token", 401);

  const balance = await agentService.getBalance(agent.public_key);

  return sendSuccess(res, 200, {
    agentId: agent.id,
    name: agent.name,
    publicKey: agent.public_key,
    status: agent.status,
    balance,
    limits: {
      dailyLimitUsdc: agent.daily_limit_usdc,
      perTxLimitUsdc: agent.per_tx_limit_usdc,
      spentTodayUsdc: agent.spent_today_usdc,
      totalFundedUsdc: agent.total_funded_usdc,
      totalSpentUsdc: agent.total_spent_usdc,
      remainingBudget: agent.total_funded_usdc - agent.total_spent_usdc,
    },
  });
}

export async function agentTransactionsByToken(req: Request, res: Response): Promise<Response> {
  const token = extractBearerToken(req);
  if (!token) throw new AppError("UNAUTHORIZED", "Missing agent API token", 401);

  const agent = await agentService.getByApiToken(token);
  if (!agent) throw new AppError("UNAUTHORIZED", "Invalid or expired agent token", 401);

  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const transactions = await agentService.listTransactions(agent.id, limit);

  return sendSuccess(res, 200, transactions);
}

// ─── Helpers ────────────────────────────────────────────────────────

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

function sanitizeWallet(w: Record<string, unknown>) {
  const { encrypted_secret_key, encryption_iv, encryption_tag, ...safe } = w;
  return safe;
}
