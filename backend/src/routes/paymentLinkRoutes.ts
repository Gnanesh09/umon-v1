import { Router } from "express";
import {
  createPaymentLink,
  listMyPaymentLinks,
  getPaymentLinkDetail,
  resolveShortCode,
  updatePaymentLink,
  deactivatePaymentLink,
} from "../controllers/paymentLinkController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  createPaymentLinkSchema,
  updatePaymentLinkSchema,
  paymentLinkIdSchema,
  shortCodeSchema,
  listPaymentLinksSchema,
} from "../validators/paymentLinkSchemas.js";

export const paymentLinkRouter = Router();

// Public - resolve short code
paymentLinkRouter.get("/code/:shortCode", validate(shortCodeSchema), resolveShortCode);

// Authenticated routes
paymentLinkRouter.post("/", authenticate, validate(createPaymentLinkSchema), createPaymentLink);
paymentLinkRouter.get("/", authenticate, validate(listPaymentLinksSchema), listMyPaymentLinks);
paymentLinkRouter.get("/:id", authenticate, validate(paymentLinkIdSchema), getPaymentLinkDetail);
paymentLinkRouter.put("/:id", authenticate, validate(updatePaymentLinkSchema), updatePaymentLink);
paymentLinkRouter.delete("/:id", authenticate, validate(paymentLinkIdSchema), deactivatePaymentLink);
