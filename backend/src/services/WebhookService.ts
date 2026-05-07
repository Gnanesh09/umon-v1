import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import crypto from "crypto";

type CreateWebhookInput = {
  merchantId: string;
  url: string;
  events: string[];
};

export class WebhookService {
  async create(input: CreateWebhookInput) {
    const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

    const { data, error } = await supabase
      .from("webhooks")
      .insert({
        merchant_id: input.merchantId,
        url: input.url,
        events: input.events,
        secret,
      })
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to create webhook");
      throw error;
    }
    return data;
  }

  async listByMerchant(merchantId: string) {
    const { data, error } = await supabase
      .from("webhooks")
      .select("id, merchant_id, url, events, is_active, last_triggered_at, failure_count, created_at")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ err: error }, "Failed to list webhooks");
      return [];
    }
    return data ?? [];
  }

  async delete(id: string, merchantId: string) {
    const { error } = await supabase
      .from("webhooks")
      .delete()
      .eq("id", id)
      .eq("merchant_id", merchantId);

    if (error) {
      logger.error({ err: error, id }, "Failed to delete webhook");
      return false;
    }
    return true;
  }

  async deliver(merchantId: string, eventType: string, payload: Record<string, unknown>) {
    const { data: webhooks } = await supabase
      .from("webhooks")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("is_active", true)
      .contains("events", [eventType]);

    if (!webhooks || webhooks.length === 0) return;

    for (const webhook of webhooks) {
      const body = JSON.stringify(payload);
      const signature = crypto
        .createHmac("sha256", webhook.secret)
        .update(body)
        .digest("hex");

      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PowerMoney-Signature": signature,
            "X-PowerMoney-Event": eventType,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        await supabase.from("webhook_deliveries").insert({
          webhook_id: webhook.id,
          event_type: eventType,
          payload,
          response_status: response.status,
          delivered_at: new Date().toISOString(),
          attempts: 1,
        });

        await supabase
          .from("webhooks")
          .update({
            last_triggered_at: new Date().toISOString(),
            failure_count: 0,
          })
          .eq("id", webhook.id);
      } catch (err) {
        logger.error({ err, webhookId: webhook.id, eventType }, "Webhook delivery failed");

        await supabase.from("webhook_deliveries").insert({
          webhook_id: webhook.id,
          event_type: eventType,
          payload,
          response_status: null,
          attempts: 1,
        });

        await supabase
          .from("webhooks")
          .update({
            failure_count: (webhook.failure_count ?? 0) + 1,
          })
          .eq("id", webhook.id);
      }
    }
  }
}
