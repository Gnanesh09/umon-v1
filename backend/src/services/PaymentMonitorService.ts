import { connection } from "../lib/solana.js";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { PaymentSessionService } from "./PaymentSessionService.js";
import { PaymentLinkService } from "./PaymentLinkService.js";

const SCAN_INTERVAL_MS = 15_000;

export class PaymentMonitorService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private sessionService = new PaymentSessionService();
  private linkService = new PaymentLinkService();

  async start(): Promise<void> {
    this.intervalId = setInterval(() => {
      void this.scan();
    }, SCAN_INTERVAL_MS);

    void this.scan();
    logger.info({ intervalMs: SCAN_INTERVAL_MS }, "PaymentMonitorService started");
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async scan(): Promise<void> {
    try {
      await Promise.all([
        this.expireStaleSessions(),
        this.checkPendingConfirmations(),
        this.processAutoRefunds(),
      ]);
    } catch (error) {
      logger.error({ err: error }, "PaymentMonitorService scan failed");
    }
  }

  /**
   * Find sessions where status in ('created','paying') and expires_at < now(),
   * update them to 'expired'.
   */
  private async expireStaleSessions(): Promise<void> {
    const now = new Date().toISOString();

    const { data: staleSessions, error } = await supabase
      .from("payment_sessions")
      .select("id")
      .in("status", ["created", "paying"])
      .lt("expires_at", now)
      .limit(100);

    if (error) {
      logger.error({ err: error }, "Failed to query stale sessions");
      return;
    }

    if (!staleSessions || staleSessions.length === 0) return;

    for (const session of staleSessions) {
      try {
        await this.sessionService.expireSession(session.id);
        logger.debug({ sessionId: session.id }, "Expired stale payment session");
      } catch (err) {
        logger.error({ err, sessionId: session.id }, "Failed to expire session");
      }
    }

    if (staleSessions.length > 0) {
      logger.info({ count: staleSessions.length }, "Expired stale payment sessions");
    }
  }

  /**
   * Find sessions where status = 'confirming', check on-chain tx status.
   * If confirmed/finalized, call confirmPayment. If error, call failPayment.
   */
  private async checkPendingConfirmations(): Promise<void> {
    const { data: pendingSessions, error } = await supabase
      .from("payment_sessions")
      .select("id, tx_signature, payment_link_id")
      .eq("status", "confirming")
      .limit(50);

    if (error) {
      logger.error({ err: error }, "Failed to query pending confirmations");
      return;
    }

    if (!pendingSessions || pendingSessions.length === 0) return;

    for (const session of pendingSessions) {
      try {
        if (!session.tx_signature) {
          await this.sessionService.failPayment(session.id, "No transaction signature");
          continue;
        }

        const result = await connection.getSignatureStatus(session.tx_signature, {
          searchTransactionHistory: true,
        });

        const status = result?.value;

        if (!status) {
          // Transaction not found yet, might still be propagating
          continue;
        }

        if (status.err) {
          await this.sessionService.failPayment(
            session.id,
            `Transaction failed on-chain: ${JSON.stringify(status.err)}`,
          );
          logger.info({ sessionId: session.id, sig: session.tx_signature }, "Payment failed on-chain");
          continue;
        }

        if (
          status.confirmationStatus === "confirmed" ||
          status.confirmationStatus === "finalized"
        ) {
          await this.sessionService.confirmPayment(session.id);

          // Increment use count on the payment link
          if (session.payment_link_id) {
            await this.linkService.incrementUseCount(session.payment_link_id);
          }

          logger.info(
            { sessionId: session.id, sig: session.tx_signature, status: status.confirmationStatus },
            "Payment confirmed on-chain",
          );
        }
      } catch (err) {
        logger.error({ err, sessionId: session.id }, "Failed to check confirmation");
      }
    }
  }

  /**
   * Find sessions where status = 'expired' AND tx_signature IS NOT NULL
   * AND refund_tx_signature IS NULL. These need investigation.
   */
  private async processAutoRefunds(): Promise<void> {
    const { data: candidates, error } = await supabase
      .from("payment_sessions")
      .select("id, tx_signature, payer_wallet, amount_usdc, recipient_wallet")
      .eq("status", "expired")
      .not("tx_signature", "is", null)
      .is("refund_tx_signature", null)
      .limit(20);

    if (error) {
      logger.error({ err: error }, "Failed to query auto-refund candidates");
      return;
    }

    if (!candidates || candidates.length === 0) return;

    for (const session of candidates) {
      try {
        if (!session.tx_signature) continue;

        // Check if the transaction actually landed on-chain
        const result = await connection.getSignatureStatus(session.tx_signature, {
          searchTransactionHistory: true,
        });

        const status = result?.value;

        if (!status || status.err) {
          // Transaction didn't land or failed, no refund needed
          // Mark as failed so we don't keep checking
          await this.sessionService.failPayment(
            session.id,
            status?.err
              ? `Expired with failed tx: ${JSON.stringify(status.err)}`
              : "Expired with unconfirmed transaction",
          );
          logger.info(
            { sessionId: session.id, sig: session.tx_signature },
            "Expired session tx did not land, marked as failed",
          );
          continue;
        }

        if (
          status.confirmationStatus === "confirmed" ||
          status.confirmationStatus === "finalized"
        ) {
          // Money moved but session expired - flag for manual refund
          logger.warn(
            {
              sessionId: session.id,
              sig: session.tx_signature,
              payerWallet: session.payer_wallet,
              amountUsdc: session.amount_usdc,
            },
            "Expired session has confirmed tx - manual refund may be needed",
          );
          // We don't auto-refund on-chain (requires merchant signing).
          // Just log the warning for ops to handle.
        }
      } catch (err) {
        logger.error({ err, sessionId: session.id }, "Failed to process auto-refund candidate");
      }
    }
  }
}
