import { z } from "zod";

export const walletParamSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({ wallet: z.string().min(32) }),
});