import { Router } from "express";
import { createRefund, listRefunds } from "../controllers/refundController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

const createRefundSchema = z.object({
  body: z.object({
    sessionId: z.string().uuid(),
    amountUsdc: z.number().positive(),
    reason: z.string().max(1000).optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

const listRefundsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    limit: z.string().optional(),
  }),
  params: z.object({}).passthrough(),
});

export const refundRouter = Router();

// Authenticated routes (merchant)
refundRouter.post("/", authenticate, validate(createRefundSchema), createRefund);
refundRouter.get("/", authenticate, validate(listRefundsSchema), listRefunds);
