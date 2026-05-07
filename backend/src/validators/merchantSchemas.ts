import { z } from "zod";

export const listMerchantsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    category: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
  params: z.object({}).passthrough(),
});

export const registerMerchantSchema = z.object({
  body: z.object({
    businessName: z.string().min(1).max(200),
    businessType: z.string().optional(),
    category: z.string().min(1),
    businessWallet: z.string().min(32).max(44),
    description: z.string().max(1000).optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),
    contactEmail: z.string().email().optional().or(z.literal("")),
    contactPhone: z.string().optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const merchantIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});

export const rejectMerchantSchema = z.object({
  body: z.object({ reason: z.string().optional() }),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateMerchantSchema = z.object({
  body: z.object({
    businessName: z.string().min(1).max(200).optional(),
    businessType: z.string().optional(),
    businessWallet: z.string().min(32).max(44).optional(),
    description: z.string().max(1000).optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    website: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal("")),
    contactPhone: z.string().optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() }),
});
