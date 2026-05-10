import { z } from "zod";

const solanaWallet = z.string().min(32).max(44);
const passQuery = z.object({}).passthrough();
const passParams = z.object({}).passthrough();
const passBody = z.object({}).passthrough();

// ─── Owner-authenticated schemas ───────────────────────────────────

export const createAgentWalletSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    dailyLimitUsdc: z.number().int().positive().optional(),
    perTxLimitUsdc: z.number().int().positive().optional(),
    allowedCategories: z.array(z.string()).optional(),
    allowedRecipients: z.array(solanaWallet).optional(),
  }),
  query: passQuery,
  params: passParams,
});

export const agentWalletIdSchema = z.object({
  body: passBody,
  query: passQuery,
  params: z.object({ id: z.string().uuid() }),
});

export const updateAgentLimitsSchema = z.object({
  body: z.object({
    dailyLimitUsdc: z.number().int().positive().optional(),
    perTxLimitUsdc: z.number().int().positive().optional(),
    allowedCategories: z.array(z.string()).optional(),
    allowedRecipients: z.array(solanaWallet).optional(),
  }),
  query: passQuery,
  params: z.object({ id: z.string().uuid() }),
});

export const agentPaySchema = z.object({
  body: z.object({
    toWallet: solanaWallet,
    amountUsdc: z.number().int().positive(),
    memo: z.string().max(200).optional(),
  }),
  query: passQuery,
  params: z.object({ id: z.string().uuid() }),
});

// ─── Agent-token schemas ───────────────────────────────────────────

export const agentPayByTokenSchema = z.object({
  body: z.object({
    toWallet: solanaWallet,
    amountUsdc: z.number().int().positive(),
    memo: z.string().max(200).optional(),
  }),
  query: passQuery,
  params: passParams,
});

export const agentCreateVaultSchema = z.object({
  body: z.object({
    recipientWallet: solanaWallet,
    amountUsdc: z.number().int().positive(),
    description: z.string().max(500).optional(),
    conditions: z.array(z.object({
      type: z.enum(["time_lock", "milestone", "oracle", "auto_split", "category"]),
    }).passthrough()).optional(),
  }),
  query: passQuery,
  params: passParams,
});

export const agentListVaultsSchema = z.object({
  body: passBody,
  query: z.object({
    role: z.enum(["creator", "recipient"]).optional(),
    status: z.enum(["active", "released", "partially_released", "cancelled", "disputed"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }).passthrough(),
  params: passParams,
});

export const agentVaultIdSchema = z.object({
  body: passBody,
  query: passQuery,
  params: z.object({ id: z.string().uuid() }),
});

export const agentCreatePaymentLinkSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    amountUsdc: z.number().int().positive().optional(),
    recipientWallet: solanaWallet.optional(),
    maxUses: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
  query: passQuery,
  params: passParams,
});

export const agentPayLinkSchema = z.object({
  body: z.object({
    shortCode: z.string().min(1).max(20),
    amountUsdc: z.number().int().positive().optional(),
  }),
  query: passQuery,
  params: passParams,
});

export const agentBatchPaySchema = z.object({
  body: z.object({
    payments: z.array(z.object({
      toWallet: solanaWallet,
      amountUsdc: z.number().int().positive(),
      memo: z.string().max(200).optional(),
    })).min(1).max(10),
  }),
  query: passQuery,
  params: passParams,
});

export const agentSchedulePaymentSchema = z.object({
  body: z.object({
    toWallet: solanaWallet,
    amountUsdc: z.number().int().positive(),
    memo: z.string().max(200).optional(),
    executeAt: z.string().datetime(),
  }),
  query: passQuery,
  params: passParams,
});

export const agentScheduledTxIdSchema = z.object({
  body: passBody,
  query: passQuery,
  params: z.object({ txId: z.string().uuid() }),
});

export const agentCreateInvoiceSchema = z.object({
  body: z.object({
    lineItems: z.array(z.object({
      description: z.string().min(1),
      quantity: z.number().positive(),
      unitPrice: z.number().int().positive(),
    })).min(1).max(50),
    customerInfo: z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      wallet: solanaWallet.optional(),
    }).optional(),
    dueDate: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
  }),
  query: passQuery,
  params: passParams,
});

export const agentDiscoverMerchantsSchema = z.object({
  body: passBody,
  query: z.object({
    category: z.string().optional(),
    search: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }).passthrough(),
  params: passParams,
});

export const agentAnalyticsSchema = z.object({
  body: passBody,
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).optional(),
  }).passthrough(),
  params: passParams,
});
