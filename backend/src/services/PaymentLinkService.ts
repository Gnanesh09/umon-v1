import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import crypto from "crypto";

function generateShortCode(): string {
  return crypto.randomBytes(6).toString("base64url").slice(0, 10);
}

type CreatePaymentLinkInput = {
  ownerType: "merchant" | "user";
  ownerWallet: string;
  merchantId?: string;
  recipientWallet: string;
  amountUsdc?: number;
  title: string;
  description?: string;
  conditions?: unknown[];
  maxUses?: number;
  expiresAt?: string;
};

export class PaymentLinkService {
  async create(input: CreatePaymentLinkInput) {
    let shortCode = generateShortCode();

    // Retry on collision (extremely rare)
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from("payment_links")
        .insert({
          short_code: shortCode,
          owner_type: input.ownerType,
          owner_wallet: input.ownerWallet,
          merchant_id: input.merchantId ?? null,
          recipient_wallet: input.recipientWallet,
          amount_usdc: input.amountUsdc ?? null,
          title: input.title,
          description: input.description ?? null,
          conditions: input.conditions ?? [],
          max_uses: input.maxUses ?? null,
          expires_at: input.expiresAt ?? null,
        })
        .select("*")
        .single();

      if (error && error.code === "23505" && error.message.includes("short_code")) {
        shortCode = generateShortCode();
        continue;
      }
      if (error) {
        logger.error({ err: error }, "Failed to create payment link");
        throw error;
      }
      return data;
    }
    throw new Error("Failed to generate unique short code");
  }

  async getByShortCode(shortCode: string) {
    const { data, error } = await supabase
      .from("payment_links")
      .select("*")
      .eq("short_code", shortCode)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

    // Check max uses
    if (data.max_uses && data.use_count >= data.max_uses) return null;

    return data;
  }

  async listByOwner(wallet: string, limit = 50) {
    const { data, error } = await supabase
      .from("payment_links")
      .select("*")
      .eq("owner_wallet", wallet)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ err: error }, "Failed to list payment links");
      return [];
    }
    return data ?? [];
  }

  async getById(id: string) {
    const { data } = await supabase.from("payment_links").select("*").eq("id", id).single();
    return data;
  }

  async incrementUseCount(id: string) {
    const { data: link } = await supabase
      .from("payment_links")
      .select("use_count")
      .eq("id", id)
      .single();

    if (link) {
      await supabase
        .from("payment_links")
        .update({
          use_count: (link.use_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }
  }

  async deactivate(id: string, ownerWallet: string) {
    const { data, error } = await supabase
      .from("payment_links")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_wallet", ownerWallet)
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to deactivate payment link");
      return null;
    }
    return data;
  }

  async update(id: string, ownerWallet: string, updates: Partial<CreatePaymentLinkInput>) {
    const allowed: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) allowed.title = updates.title;
    if (updates.description !== undefined) allowed.description = updates.description;
    if (updates.amountUsdc !== undefined) allowed.amount_usdc = updates.amountUsdc;
    if (updates.recipientWallet !== undefined) allowed.recipient_wallet = updates.recipientWallet;
    if (updates.maxUses !== undefined) allowed.max_uses = updates.maxUses;
    if (updates.expiresAt !== undefined) allowed.expires_at = updates.expiresAt;
    if ((updates as Record<string, unknown>).isActive !== undefined) allowed.is_active = (updates as Record<string, unknown>).isActive;

    const { data, error } = await supabase
      .from("payment_links")
      .update(allowed)
      .eq("id", id)
      .eq("owner_wallet", ownerWallet)
      .select("*")
      .single();

    if (error) return null;
    return data;
  }
}
