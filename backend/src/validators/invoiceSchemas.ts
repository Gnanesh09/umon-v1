import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    merchantId: z.string().uuid(),
    lineItems: z.array(lineItemSchema).min(1).max(50),
    dueDate: z.string().datetime().optional(),
    customerInfo: z
      .object({
        name: z.string().max(200).optional(),
        email: z.string().email().optional(),
        wallet: z.string().min(32).max(44).optional(),
      })
      .optional(),
    notes: z.string().max(2000).optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const invoiceIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});

export const invoiceNumberSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({ invoiceNumber: z.string().min(1).max(20) }),
});

export const listInvoicesSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    merchantId: z.string().uuid().optional(),
    limit: z.string().optional(),
  }),
  params: z.object({}).passthrough(),
});

export const cancelInvoiceSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});
