import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";

type CreateRefundInput = {
  sessionId: string;
  merchantWallet: string;
  payerWallet: string;
  amountUsdc: number;
  reason?: string;
};

export class RefundService {
  async create(input: CreateRefundInput) {
    const { data, error } = await supabase
      .from("refunds")
      .insert({
        payment_session_id: input.sessionId,
        initiator_type: "merchant",
        initiator_wallet: input.merchantWallet,
        recipient_wallet: input.payerWallet,
        amount_usdc: input.amountUsdc,
        reason: input.reason ?? "Merchant initiated refund",
        status: "pending",
      })
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to create refund");
      throw error;
    }
    return data;
  }

  async getById(id: string) {
    const { data } = await supabase.from("refunds").select("*").eq("id", id).single();
    return data;
  }

  async listByMerchant(merchantWallet: string, limit = 50) {
    const { data, error } = await supabase
      .from("refunds")
      .select("*")
      .eq("initiator_wallet", merchantWallet)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ err: error }, "Failed to list refunds");
      return [];
    }
    return data ?? [];
  }

  async markCompleted(id: string, txSignature: string) {
    const { data, error } = await supabase
      .from("refunds")
      .update({
        status: "completed",
        tx_signature: txSignature,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending")
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, id }, "Failed to mark refund as completed");
      return null;
    }
    return data;
  }

  async markFailed(id: string, errorMessage: string) {
    const { data, error } = await supabase
      .from("refunds")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, id }, "Failed to mark refund as failed");
      return null;
    }
    return data;
  }
}
