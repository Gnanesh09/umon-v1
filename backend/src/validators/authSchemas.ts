import { z } from "zod";

export const nonceSchema = z.object({
  body: z.object({ walletAddress: z.string().min(32).max(64) }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const verifySchema = z.object({
  body: z.object({
    walletAddress: z.string().min(32).max(64),
    signature: z.string().min(10),
    nonce: z.string().min(10),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});