import { z } from "zod";

const conditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("time_lock"), releaseTime: z.string(), percentage: z.number().int().min(1).max(100) }),
  z.object({ type: z.literal("milestone"), description: z.string().min(1), approvers: z.array(z.string()).min(1).max(8), percentage: z.number().int().min(1).max(100) }),
  z.object({ type: z.literal("auto_split"), splits: z.array(z.object({ wallet: z.string(), percentage: z.number().int().min(1).max(100) })).min(1).max(10) }),
  z.object({ type: z.literal("oracle"), feed: z.string(), operator: z.enum(["lt", "gt", "eq", "lte", "gte"]), threshold: z.number(), percentage: z.number().int().min(1).max(100) }),
  z.object({ type: z.literal("category"), merchantRegistry: z.string(), categories: z.array(z.string()).min(1), percentage: z.number().int().min(1).max(100) }),
]);

export const listVaultsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    creator: z.string().optional(),
    recipient: z.string().optional(),
    status: z.enum(["active", "partially_released", "released", "disputed", "cancelled"]).optional(),
    sortBy: z.enum(["created_at", "amount"]).default("created_at"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
  params: z.object({}).passthrough(),
});

export const createVaultSchema = z.object({
  body: z.object({
    onChainId: z.string().min(1),
    creatorWallet: z.string().min(32),
    recipientWallet: z.string().min(32),
    amountUsdc: z.number().int().positive(),
    releasedAmountUsdc: z.number().int().nonnegative().default(0),
    status: z.enum(["active", "partially_released", "released", "disputed", "cancelled"]).default("active"),
    description: z.string().max(500).optional(),
    conditions: z.array(conditionSchema).min(1),
    txSignature: z.string().optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const vaultIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});

export const actionSchema = z.object({
  body: z.object({
    txSignature: z.string().optional(),
    reason: z.string().optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});