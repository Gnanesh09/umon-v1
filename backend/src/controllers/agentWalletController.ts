import type { Request, Response } from "express";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { AgentWalletService } from "../services/AgentWalletService.js";
import { PaymentLinkService } from "../services/PaymentLinkService.js";
import { PaymentSessionService } from "../services/PaymentSessionService.js";
import { InvoiceService } from "../services/InvoiceService.js";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import type { AuthenticatedRequest } from "../types/api.js";

const agentService = new AgentWalletService();
const paymentLinkService = new PaymentLinkService();
const paymentSessionService = new PaymentSessionService();
const invoiceService = new InvoiceService();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

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
  const agent = await resolveAgent(req);

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
  const agent = await resolveAgent(req);
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
  const agent = await resolveAgent(req);

  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const transactions = await agentService.listTransactions(agent.id, limit);

  return sendSuccess(res, 200, transactions);
}

// ─── Agent-token: Vault operations ─────────────────────────────────

export async function agentCreateVaultByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);

  const {
    recipientWallet, amountUsdc, description, conditions,
  } = req.body as {
    recipientWallet: string;
    amountUsdc: number;
    description?: string;
    conditions?: Array<{ type: string; [key: string]: unknown }>;
  };

  const normalized = (conditions ?? []).map((c) => normalizeCondition(c));

  const { data, error } = await supabase
    .from("vaults")
    .insert({
      on_chain_id: `agent-${agent.id}-${Date.now()}`,
      creator_wallet: agent.public_key,
      recipient_wallet: recipientWallet,
      amount_usdc: amountUsdc,
      released_amount_usdc: 0,
      status: "active",
      description: description ?? `Created by AI agent: ${agent.name}`,
      conditions: normalized,
    })
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to create vault", 500, { details: error.message });

  logger.info({ agentId: agent.id, vaultId: data.id }, "Agent created vault");
  return sendSuccess(res, 201, data);
}

export async function agentListVaultsByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);

  const role = (req.query.role as string) ?? "creator";
  const status = req.query.status as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 20;

  let query = supabase
    .from("vaults")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (role === "recipient") {
    query = query.eq("recipient_wallet", agent.public_key);
  } else {
    query = query.eq("creator_wallet", agent.public_key);
  }
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new AppError("DATABASE_ERROR", "Failed to list vaults", 500, { details: error.message });

  return sendSuccess(res, 200, data ?? []);
}

export async function agentGetVaultByToken(req: Request, res: Response): Promise<Response> {
  await resolveAgent(req);

  const { data, error } = await supabase.from("vaults").select("*").eq("id", req.params.id).single();
  if (error || !data) throw new AppError("NOT_FOUND", "Vault not found", 404);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("vault_id", data.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return sendSuccess(res, 200, { ...data, transactions: transactions ?? [] });
}

// ─── Agent-token: Payment link operations ──────────────────────────

export async function agentCreatePaymentLinkByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);

  const { title, description, amountUsdc, recipientWallet, maxUses, expiresAt } = req.body as {
    title: string;
    description?: string;
    amountUsdc?: number;
    recipientWallet?: string;
    maxUses?: number;
    expiresAt?: string;
  };

  const link = await paymentLinkService.create({
    ownerType: "user",
    ownerWallet: agent.public_key,
    recipientWallet: recipientWallet ?? agent.public_key,
    amountUsdc,
    title,
    description,
    maxUses,
    expiresAt,
  });

  const paymentUrl = `${FRONTEND_URL}/pay/${link.short_code}`;

  logger.info({ agentId: agent.id, linkId: link.id }, "Agent created payment link");
  return sendSuccess(res, 201, { ...link, paymentUrl });
}

export async function agentListPaymentLinksByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);
  const limit = req.query.limit ? Number(req.query.limit) : 20;

  const links = await paymentLinkService.listByOwner(agent.public_key, limit);
  const enriched = links.map((l) => ({
    ...l,
    paymentUrl: `${FRONTEND_URL}/pay/${l.short_code}`,
  }));

  return sendSuccess(res, 200, enriched);
}

export async function agentDeactivatePaymentLinkByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);

  const result = await paymentLinkService.deactivate(req.params.id, agent.public_key);
  if (!result) throw new AppError("NOT_FOUND", "Payment link not found or not owned by this agent", 404);

  return sendSuccess(res, 200, result);
}

// ─── Agent-token: Pay a payment link (agent as payer) ──────────────

export async function agentPayLinkByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);

  const { shortCode, amountUsdc } = req.body as {
    shortCode: string;
    amountUsdc?: number;
  };

  const link = await paymentLinkService.getByShortCode(shortCode);
  if (!link) throw new AppError("NOT_FOUND", "Payment link not found or expired", 404);

  const amount = link.amount_usdc ?? amountUsdc;
  if (!amount || amount <= 0) {
    throw new AppError("VALIDATION_ERROR", "Amount required for open-amount payment links", 400);
  }

  const session = await paymentSessionService.create({
    paymentLinkId: link.id,
    recipientWallet: link.recipient_wallet,
    amountUsdc: amount,
    payerWallet: agent.public_key,
  });

  const payResult = await agentService.pay({
    agentWalletId: agent.id,
    toWallet: link.recipient_wallet,
    amountUsdc: amount,
    memo: `Payment link: ${link.title} (${shortCode})`,
  });

  await paymentSessionService.markPaying(session.id, agent.public_key);
  await paymentSessionService.submitTx(session.id, payResult.txSignature);

  logger.info({ agentId: agent.id, shortCode, txSig: payResult.txSignature }, "Agent paid payment link");
  return sendSuccess(res, 200, {
    session,
    payment: payResult,
    link: { id: link.id, title: link.title, shortCode: link.short_code },
  });
}

// ─── Agent-token: Batch pay ────────────────────────────────────────

export async function agentBatchPayByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);

  const { payments } = req.body as {
    payments: Array<{ toWallet: string; amountUsdc: number; memo?: string }>;
  };

  if (!payments || payments.length === 0) {
    throw new AppError("VALIDATION_ERROR", "At least one payment required", 400);
  }
  if (payments.length > 10) {
    throw new AppError("VALIDATION_ERROR", "Maximum 10 payments per batch", 400);
  }

  const results: Array<{
    toWallet: string;
    amountUsdc: number;
    status: "completed" | "failed";
    txSignature?: string;
    error?: string;
  }> = [];

  let successCount = 0;
  let failCount = 0;
  let totalSent = 0;

  for (const payment of payments) {
    try {
      const result = await agentService.pay({
        agentWalletId: agent.id,
        toWallet: payment.toWallet,
        amountUsdc: payment.amountUsdc,
        memo: payment.memo,
      });
      results.push({
        toWallet: payment.toWallet,
        amountUsdc: payment.amountUsdc,
        status: "completed",
        txSignature: result.txSignature,
      });
      successCount++;
      totalSent += payment.amountUsdc;
    } catch (err) {
      results.push({
        toWallet: payment.toWallet,
        amountUsdc: payment.amountUsdc,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
      failCount++;
    }
  }

  logger.info({ agentId: agent.id, successCount, failCount, totalSent }, "Agent batch pay completed");
  return sendSuccess(res, 200, {
    results,
    summary: { total: payments.length, succeeded: successCount, failed: failCount, totalSentUsdc: totalSent },
  });
}

// ─── Agent-token: Scheduled payments ───────────────────────────────

export async function agentSchedulePaymentByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);

  const { toWallet, amountUsdc, memo, executeAt } = req.body as {
    toWallet: string;
    amountUsdc: number;
    memo?: string;
    executeAt: string;
  };

  const scheduledTime = new Date(executeAt);
  if (scheduledTime <= new Date()) {
    throw new AppError("VALIDATION_ERROR", "executeAt must be in the future", 400);
  }

  const { data, error } = await supabase
    .from("agent_transactions")
    .insert({
      agent_wallet_id: agent.id,
      tx_type: "scheduled_pay",
      amount_usdc: amountUsdc,
      to_wallet: toWallet,
      from_wallet: agent.public_key,
      memo: memo ?? null,
      status: "scheduled",
      metadata: { executeAt: scheduledTime.toISOString() },
    })
    .select("*")
    .single();

  if (error) throw new AppError("DATABASE_ERROR", "Failed to schedule payment", 500, { details: error.message });

  logger.info({ agentId: agent.id, txId: data.id, executeAt }, "Agent scheduled payment");
  return sendSuccess(res, 201, data);
}

export async function agentListScheduledByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);

  const { data, error } = await supabase
    .from("agent_transactions")
    .select("*")
    .eq("agent_wallet_id", agent.id)
    .eq("tx_type", "scheduled_pay")
    .in("status", ["scheduled", "pending"])
    .order("created_at", { ascending: false });

  if (error) throw new AppError("DATABASE_ERROR", "Failed to list scheduled payments", 500);
  return sendSuccess(res, 200, data ?? []);
}

export async function agentCancelScheduledByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);

  const { data, error } = await supabase
    .from("agent_transactions")
    .update({ status: "cancelled" })
    .eq("id", req.params.txId)
    .eq("agent_wallet_id", agent.id)
    .eq("status", "scheduled")
    .select("*")
    .single();

  if (error || !data) throw new AppError("NOT_FOUND", "Scheduled payment not found or already executed", 404);
  return sendSuccess(res, 200, data);
}

// ─── Agent-token: Invoices ─────────────────────────────────────────

export async function agentCreateInvoiceByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);

  const { lineItems, customerInfo, dueDate, notes } = req.body as {
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
    customerInfo?: { name?: string; email?: string; wallet?: string };
    dueDate?: string;
    notes?: string;
  };

  const { data: merchant } = await supabase
    .from("merchants")
    .select("merchant_id")
    .eq("business_wallet", agent.public_key)
    .eq("status", "approved")
    .single();

  const invoice = await invoiceService.create({
    merchantId: merchant?.merchant_id ?? `agent-${agent.id}`,
    merchantWallet: agent.public_key,
    lineItems,
    customerInfo,
    dueDate,
    notes,
  });

  logger.info({ agentId: agent.id, invoiceId: invoice.id }, "Agent created invoice");
  return sendSuccess(res, 201, invoice);
}

export async function agentListInvoicesByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);
  const limit = req.query.limit ? Number(req.query.limit) : 20;

  const { data: merchant } = await supabase
    .from("merchants")
    .select("merchant_id")
    .eq("business_wallet", agent.public_key)
    .single();

  const merchantId = merchant?.merchant_id ?? `agent-${agent.id}`;
  const invoices = await invoiceService.listByMerchant(merchantId, limit);

  return sendSuccess(res, 200, invoices);
}

// ─── Agent-token: Merchant discovery ───────────────────────────────

export async function agentDiscoverMerchantsByToken(req: Request, res: Response): Promise<Response> {
  await resolveAgent(req);

  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 20;

  let query = supabase
    .from("merchants")
    .select("merchant_id, business_name, business_wallet, category, description, website, status")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category", category);
  if (search) query = query.ilike("business_name", `%${search}%`);

  const { data, error } = await query;
  if (error) throw new AppError("DATABASE_ERROR", "Failed to discover merchants", 500);

  return sendSuccess(res, 200, data ?? []);
}

// ─── Agent-token: Spending analytics ───────────────────────────────

export async function agentAnalyticsByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);

  const days = req.query.days ? Number(req.query.days) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: transactions, error } = await supabase
    .from("agent_transactions")
    .select("*")
    .eq("agent_wallet_id", agent.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) throw new AppError("DATABASE_ERROR", "Failed to fetch analytics", 500);

  const txs = transactions ?? [];
  const completed = txs.filter((t) => t.status === "completed");
  const failed = txs.filter((t) => t.status === "failed");
  const rejected = txs.filter((t) => t.status === "rejected");

  const totalSpent = completed.reduce((sum: number, t) => sum + Number(t.amount_usdc ?? 0), 0);

  const byRecipient: Record<string, { count: number; totalUsdc: number }> = {};
  for (const t of completed) {
    const to = t.to_wallet ?? "unknown";
    if (!byRecipient[to]) byRecipient[to] = { count: 0, totalUsdc: 0 };
    byRecipient[to].count++;
    byRecipient[to].totalUsdc += Number(t.amount_usdc ?? 0);
  }

  const byDay: Record<string, { count: number; totalUsdc: number }> = {};
  for (const t of completed) {
    const day = t.created_at?.slice(0, 10) ?? "unknown";
    if (!byDay[day]) byDay[day] = { count: 0, totalUsdc: 0 };
    byDay[day].count++;
    byDay[day].totalUsdc += Number(t.amount_usdc ?? 0);
  }

  const balance = await agentService.getBalance(agent.public_key);

  return sendSuccess(res, 200, {
    period: { days, since },
    summary: {
      totalTransactions: txs.length,
      completedCount: completed.length,
      failedCount: failed.length,
      rejectedCount: rejected.length,
      totalSpentUsdc: totalSpent,
      averageTransactionUsdc: completed.length > 0 ? Math.round(totalSpent / completed.length) : 0,
    },
    currentBalance: balance,
    limits: {
      dailyLimitUsdc: agent.daily_limit_usdc,
      perTxLimitUsdc: agent.per_tx_limit_usdc,
      spentTodayUsdc: agent.spent_today_usdc,
      remainingDailyBudget: agent.daily_limit_usdc - (agent.last_spend_date === new Date().toISOString().slice(0, 10) ? agent.spent_today_usdc : 0),
    },
    topRecipients: Object.entries(byRecipient)
      .map(([wallet, stats]) => ({ wallet, ...stats }))
      .sort((a, b) => b.totalUsdc - a.totalUsdc)
      .slice(0, 10),
    dailyBreakdown: Object.entries(byDay)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  });
}

// ─── Agent-token: Wallet info ──────────────────────────────────────

export async function agentWalletInfoByToken(req: Request, res: Response): Promise<Response> {
  const agent = await resolveAgent(req);
  const balance = await agentService.getBalance(agent.public_key);

  return sendSuccess(res, 200, {
    agentId: agent.id,
    name: agent.name,
    description: agent.description,
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
    allowedCategories: agent.allowed_categories,
    allowedRecipients: agent.allowed_recipients,
    createdAt: agent.created_at,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────

async function resolveAgent(req: Request) {
  const token = extractBearerToken(req);
  if (!token) throw new AppError("UNAUTHORIZED", "Missing agent API token", 401);

  const agent = await agentService.getByApiToken(token);
  if (!agent) throw new AppError("UNAUTHORIZED", "Invalid or expired agent token", 401);
  if (agent.status !== "active") {
    throw new AppError("FORBIDDEN", `Agent wallet is ${agent.status}`, 403);
  }

  return agent;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

function sanitizeWallet(w: Record<string, unknown>) {
  const { encrypted_secret_key, encryption_iv, encryption_tag, ...safe } = w;
  return safe;
}

function normalizeCondition(c: { type: string; [key: string]: unknown }): Record<string, unknown> {
  const base: Record<string, unknown> = { type: c.type, percentage: c.percentage ?? 100 };

  switch (c.type) {
    case "time_lock": {
      const raw = c.releaseTime ?? c.releaseDate ?? c.release_time ?? c.release_date;
      base.releaseTime = raw ? new Date(raw as string).toISOString() : new Date(Date.now() + 86_400_000).toISOString();
      break;
    }
    case "milestone":
      base.description = c.description ?? c.milestoneDescription ?? "Milestone";
      base.approvers = c.approvers ?? [];
      break;
    case "auto_split":
      base.splits = c.splits ?? [];
      break;
    case "oracle":
      base.feed = c.feed ?? c.oracleAccount ?? "";
      base.operator = c.operator ?? "gt";
      base.threshold = c.threshold ?? c.priceTarget ?? 0;
      break;
    case "category":
      base.categories = c.categories ?? [];
      break;
  }

  return base;
}
