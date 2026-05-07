import { z } from "zod";

export const createPaymentLinkSchema = z.object({
  body: z.object({
    ownerType: z.enum(["merchant", "user"]).default("user"),
    recipientWallet: z.string().min(32).max(44),
    merchantId: z.string().uuid().optional(),
    amountUsdc: z.number().positive().optional(),
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    conditions: z.array(z.unknown()).optional(),
    maxUses: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const updatePaymentLinkSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    amountUsdc: z.number().positive().optional(),
    recipientWallet: z.string().min(32).max(44).optional(),
    maxUses: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});

export const paymentLinkIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});

export const shortCodeSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({ shortCode: z.string().min(1).max(20) }),
});

export const listPaymentLinksSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    limit: z.string().optional(),
  }),
  params: z.object({}).passthrough(),
});
