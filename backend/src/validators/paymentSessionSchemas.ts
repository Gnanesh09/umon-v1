import { z } from "zod";

export const createSessionSchema = z.object({
  body: z.object({
    paymentLinkId: z.string().uuid(),
    payerWallet: z.string().min(32).max(44).optional(),
    idempotencyKey: z.string().uuid().optional(),
    amountUsdc: z.number().positive().optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const sessionIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});

export const submitPaymentSchema = z.object({
  body: z.object({
    txSignature: z.string().min(1).max(128),
    payerWallet: z.string().min(32).max(44),
  }),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});
