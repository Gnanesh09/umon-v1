import { Router } from "express";
import {
  createInvoice,
  listInvoices,
  getInvoice,
  getPublicInvoice,
  sendInvoice,
  cancelInvoice,
} from "../controllers/invoiceController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  createInvoiceSchema,
  invoiceIdSchema,
  invoiceNumberSchema,
  listInvoicesSchema,
  cancelInvoiceSchema,
} from "../validators/invoiceSchemas.js";

export const invoiceRouter = Router();

// Public - view invoice by number
invoiceRouter.get("/view/:invoiceNumber", validate(invoiceNumberSchema), getPublicInvoice);

// Authenticated routes
invoiceRouter.post("/", authenticate, validate(createInvoiceSchema), createInvoice);
invoiceRouter.get("/", authenticate, validate(listInvoicesSchema), listInvoices);
invoiceRouter.get("/:id", authenticate, validate(invoiceIdSchema), getInvoice);
invoiceRouter.put("/:id/send", authenticate, validate(invoiceIdSchema), sendInvoice);
invoiceRouter.put("/:id/cancel", authenticate, validate(cancelInvoiceSchema), cancelInvoice);
