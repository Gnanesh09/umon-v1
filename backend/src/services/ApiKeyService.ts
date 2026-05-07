import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import crypto from "crypto";

function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `pk_live_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = raw.slice(0, 12);
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, prefix, hash };
}

export class ApiKeyService {
  async create(merchantId: string, label: string) {
    const { raw, prefix, hash } = generateApiKey();

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        merchant_id: merchantId,
        key_hash: hash,
        key_prefix: prefix,
        label,
      })
      .select("id, merchant_id, key_prefix, label, permissions, is_active, created_at")
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to create API key");
      throw error;
    }

    return { ...data, key: raw };
  }

  async listByMerchant(merchantId: string) {
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, merchant_id, key_prefix, label, permissions, is_active, last_used_at, created_at")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ err: error }, "Failed to list API keys");
      return [];
    }
    return data ?? [];
  }

  async revoke(id: string, merchantId: string) {
    const { data, error } = await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", id)
      .eq("merchant_id", merchantId)
      .select("id, key_prefix, label, is_active")
      .single();

    if (error) {
      logger.error({ err: error, id }, "Failed to revoke API key");
      return null;
    }
    return data;
  }

  async validateKey(rawKey: string) {
    const hash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, merchant_id, permissions, is_active")
      .eq("key_hash", hash)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;

    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);

    return data;
  }
}
