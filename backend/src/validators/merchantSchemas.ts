import { z } from "zod";

export const listMerchantsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({ category: z.string().optional(), search: z.string().optional() }),
  params: z.object({}).passthrough(),
});

export const createMerchantSchema = z.object({
  body: z.object({
    walletAddress: z.string().min(32),
    businessName: z.string().min(1),
    category: z.string().min(1),
    country: z.string().optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const merchantIdSchema = z.object({
  body: z.object({ verified: z.boolean() }),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});