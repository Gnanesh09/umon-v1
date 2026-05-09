import { z } from "zod";

export const createAgentWalletSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    dailyLimitUsdc: z.number().int().positive().optional(),
    perTxLimitUsdc: z.number().int().positive().optional(),
    allowedCategories: z.array(z.string()).optional(),
    allowedRecipients: z.array(z.string().min(32).max(44)).optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const agentWalletIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateAgentLimitsSchema = z.object({
  body: z.object({
    dailyLimitUsdc: z.number().int().positive().optional(),
    perTxLimitUsdc: z.number().int().positive().optional(),
    allowedCategories: z.array(z.string()).optional(),
    allowedRecipients: z.array(z.string().min(32).max(44)).optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});

export const agentPaySchema = z.object({
  body: z.object({
    toWallet: z.string().min(32).max(44),
    amountUsdc: z.number().int().positive(),
    memo: z.string().max(200).optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});

export const agentPayByTokenSchema = z.object({
  body: z.object({
    toWallet: z.string().min(32).max(44),
    amountUsdc: z.number().int().positive(),
    memo: z.string().max(200).optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});
