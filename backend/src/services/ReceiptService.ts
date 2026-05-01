import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { NotificationService } from "./NotificationService.js";

type ReceiptInput = {
  vaultId: string;
  walletAddress: string;
  txSignature: string;
  receiptType: string;
  amountUsdc: number;
  feeUsdc?: number;
  recipientWallet?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

type ReceiptRow = {
  id: string;
  vault_id: string;
  wallet_address: string;
  tx_signature: string;
  receipt_type: string;
  amount_usdc: number;
  fee_usdc: number;
  recipient_wallet: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  emailed_at: string | null;
  created_at: string;
};

const notificationService = new NotificationService();

export class ReceiptService {
  async create(input: ReceiptInput): Promise<ReceiptRow | null> {
    const { data, error } = await supabase
      .from("receipts")
      .insert({
        vault_id: input.vaultId,
        wallet_address: input.walletAddress,
        tx_signature: input.txSignature,
        receipt_type: input.receiptType,
        amount_usdc: input.amountUsdc,
        fee_usdc: input.feeUsdc ?? 0,
        recipient_wallet: input.recipientWallet ?? null,
        description: input.description ?? null,
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to create receipt");
      return null;
    }
    return data as ReceiptRow;
  }

  async getByTx(txSignature: string): Promise<ReceiptRow | null> {
    const { data } = await supabase
      .from("receipts")
      .select("*")
      .eq("tx_signature", txSignature)
      .single();
    return (data as ReceiptRow) ?? null;
  }

  async listByWallet(walletAddress: string, limit = 50): Promise<ReceiptRow[]> {
    const { data } = await supabase
      .from("receipts")
      .select("*")
      .eq("wallet_address", walletAddress)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as ReceiptRow[]) ?? [];
  }

  async emailReceipt(receiptId: string): Promise<boolean> {
    const { data: receipt } = await supabase
      .from("receipts")
      .select("*")
      .eq("id", receiptId)
      .single();

    if (!receipt) return false;
    const r = receipt as ReceiptRow;

    const { data: user } = await supabase
      .from("users")
      .select("email, email_notifications")
      .eq("wallet_address", r.wallet_address)
      .single();

    if (!user?.email) return false;

    const html = this.renderReceiptHtml(r);
    const typeLabel = r.receipt_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    try {
      await notificationService.notifyByEmailIfProfileExists(
        r.wallet_address,
        `PowerMoney Receipt — ${typeLabel}`,
        html,
      );
      await supabase
        .from("receipts")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", receiptId);
      return true;
    } catch (e) {
      logger.error({ err: e, receiptId }, "Failed to email receipt");
      return false;
    }
  }

  renderReceiptHtml(r: ReceiptRow): string {
    const amountUsdc = (r.amount_usdc / 1_000_000).toFixed(2);
    const feeUsdc = (r.fee_usdc / 1_000_000).toFixed(4);
    const totalUsdc = ((r.amount_usdc + r.fee_usdc) / 1_000_000).toFixed(4);
    const typeLabel = r.receipt_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const date = new Date(r.created_at).toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "short",
    });
    const explorerUrl = `https://explorer.solana.com/tx/${r.tx_signature}?cluster=devnet`;
    const shortTx = `${r.tx_signature.slice(0, 12)}...${r.tx_signature.slice(-6)}`;
    const shortWallet = (w: string) => `${w.slice(0, 6)}...${w.slice(-4)}`;

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
  .container { max-width: 560px; margin: 24px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 24px; color: #fff; text-align: center; }
  .header h1 { margin: 0 0 4px; font-size: 22px; }
  .header p { margin: 0; opacity: 0.85; font-size: 14px; }
  .body { padding: 24px; }
  .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; font-size: 14px; }
  .row:last-child { border: none; }
  .label { color: #666; }
  .value { font-weight: 600; color: #111; text-align: right; max-width: 60%; word-break: break-all; }
  .total-row { background: #f8f7ff; margin: 16px -24px; padding: 16px 24px; display: flex; justify-content: space-between; font-size: 16px; }
  .total-row .label { font-weight: 600; color: #333; }
  .total-row .value { font-weight: 700; color: #6366f1; }
  .fee-row .value { color: #888; font-size: 13px; }
  .footer { padding: 16px 24px; background: #fafafa; text-align: center; font-size: 12px; color: #999; }
  .footer a { color: #6366f1; text-decoration: none; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #e8e7ff; color: #6366f1; margin-top: 8px; }
</style>
</head><body>
<div class="container">
  <div class="header">
    <h1>PowerMoney</h1>
    <p>Transaction Receipt</p>
    <div class="badge">${typeLabel}</div>
  </div>
  <div class="body">
    <div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
    <div class="row"><span class="label">Transaction</span><span class="value"><a href="${explorerUrl}" style="color:#6366f1;text-decoration:none">${shortTx}</a></span></div>
    <div class="row"><span class="label">From</span><span class="value">${shortWallet(r.wallet_address)}</span></div>
    ${r.recipient_wallet ? `<div class="row"><span class="label">To</span><span class="value">${shortWallet(r.recipient_wallet)}</span></div>` : ""}
    ${r.description ? `<div class="row"><span class="label">Description</span><span class="value">${r.description}</span></div>` : ""}
    <div class="row"><span class="label">Amount</span><span class="value">${amountUsdc} USDC</span></div>
    ${r.fee_usdc > 0 ? `<div class="row fee-row"><span class="label">Platform Fee (0.5%)</span><span class="value">${feeUsdc} USDC</span></div>` : ""}
    ${r.fee_usdc > 0 ? `<div class="total-row"><span class="label">Total Charged</span><span class="value">${totalUsdc} USDC</span></div>` : ""}
  </div>
  <div class="footer">
    <p>This is an automated receipt from <a href="https://powermoney.app">PowerMoney</a></p>
    <p><a href="${explorerUrl}">View on Solana Explorer</a></p>
  </div>
</div>
</body></html>`;
  }
}
