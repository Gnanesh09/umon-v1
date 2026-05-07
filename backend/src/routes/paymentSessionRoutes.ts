import { Router } from "express";
import {
  createSession,
  getSession,
  submitPayment,
} from "../controllers/paymentSessionController.js";
import { validate } from "../middleware/validate.js";
import {
  createSessionSchema,
  sessionIdSchema,
  submitPaymentSchema,
} from "../validators/paymentSessionSchemas.js";

export const paymentSessionRouter = Router();

// All public routes (payer-facing, no auth required)
paymentSessionRouter.post("/", validate(createSessionSchema), createSession);
paymentSessionRouter.get("/:id", validate(sessionIdSchema), getSession);
paymentSessionRouter.put("/:id/pay", validate(submitPaymentSchema), submitPayment);
