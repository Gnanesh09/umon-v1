import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import crypto from "crypto";

type CreateSessionInput = {
  paymentLinkId: string;
  recipientWallet: string;
  amountUsdc: number;
  payerWallet?: string;
  idempotencyKey?: string;
};

export class PaymentSessionService {
  async create(input: CreateSessionInput) {
    const idempotencyKey = input.idempotencyKey ?? crypto.randomUUID();

    // Check for existing session with same idempotency key
    const { data: existing } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existing) return existing;

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("payment_sessions")
      .insert({
        payment_link_id: input.paymentLinkId,
        recipient_wallet: input.recipientWallet,
        amount_usdc: input.amountUsdc,
        payer_wallet: input.payerWallet ?? null,
        idempotency_key: idempotencyKey,
        status: "created",
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to create payment session");
      throw error;
    }
    return data;
  }

  async getById(id: string) {
    const { data } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("id", id)
      .single();
    return data;
  }

  async markPaying(sessionId: string, payerWallet: string) {
    const { data, error } = await supabase
      .from("payment_sessions")
      .update({
        status: "paying",
        payer_wallet: payerWallet,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("status", "created")
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, sessionId }, "Failed to mark session as paying");
      return null;
    }
    return data;
  }

  async submitTx(sessionId: string, txSignature: string) {
    const { data, error } = await supabase
      .from("payment_sessions")
      .update({
        status: "confirming",
        tx_signature: txSignature,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("status", "paying")
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, sessionId }, "Failed to submit tx for session");
      return null;
    }
    return data;
  }

  async confirmPayment(sessionId: string) {
    const { data, error } = await supabase
      .from("payment_sessions")
      .update({
        status: "completed",
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("status", "confirming")
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, sessionId }, "Failed to confirm payment session");
      return null;
    }
    return data;
  }

  async expireSession(sessionId: string) {
    const { data, error } = await supabase
      .from("payment_sessions")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .in("status", ["created", "paying"])
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, sessionId }, "Failed to expire session");
      return null;
    }
    return data;
  }

  async failPayment(sessionId: string, errorMessage: string) {
    const { data, error } = await supabase
      .from("payment_sessions")
      .update({
        status: "failed",
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, sessionId }, "Failed to mark session as failed");
      return null;
    }
    return data;
  }

  async markRefunded(sessionId: string, refundTxSignature: string) {
    const { data, error } = await supabase
      .from("payment_sessions")
      .update({
        status: "refunded",
        refund_tx_signature: refundTxSignature,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, sessionId }, "Failed to mark session as refunded");
      return null;
    }
    return data;
  }
}
