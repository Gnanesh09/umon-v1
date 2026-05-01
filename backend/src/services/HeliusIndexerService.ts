import WebSocket from "ws";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";
import { NotificationService } from "./NotificationService.js";

export class HeliusIndexerService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly notificationService = new NotificationService();
  private readonly programId = env.PROGRAM_ID;

  start(): void {
    if (!env.HELIUS_API_KEY) {
      logger.warn("HELIUS_API_KEY not set, HeliusIndexerService disabled");
      return;
    }

    const url = `wss://devnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;
    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      this.reconnectAttempts = 0;
      logger.info("Helius websocket connected");
      this.subscribeToProgram();
    });

    this.ws.on("message", async (raw: Buffer) => {
      try {
        const payload = JSON.parse(raw.toString()) as Record<string, unknown>;
        if (payload.method === "logsNotification") {
          const result = (payload.params as Record<string, unknown>)?.result as Record<string, unknown>;
          const value = result?.value as Record<string, unknown>;
          if (value) {
            await this.processLogs(value);
          }
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to handle helius payload");
      }
    });

    this.ws.on("close", () => {
      logger.warn("Helius websocket closed, reconnecting...");
      this.reconnectWithBackoff();
    });

    this.ws.on("error", (error: Error) => {
      logger.error({ err: error }, "Helius websocket error");
    });
  }

  private subscribeToProgram(): void {
    if (!this.ws) return;

    const subscribeMsg = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "logsSubscribe",
      params: [
        { mentions: [this.programId] },
        { commitment: "confirmed" },
      ],
    });

    this.ws.send(subscribeMsg);
    logger.info({ programId: this.programId }, "Subscribed to program logs");
  }

  private reconnectWithBackoff(): void {
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    logger.info({ delay, attempt: this.reconnectAttempts }, "Reconnecting...");
    setTimeout(() => this.start(), delay);
  }

  private async processLogs(value: Record<string, unknown>): Promise<void> {
    const logs = (value.logs ?? []) as string[];
    const signature = String(value.signature ?? "");

    for (const log of logs) {
      if (log.includes("VaultCreated")) {
        await this.handleVaultCreated(signature, logs);
      } else if (log.includes("FundsReleased")) {
        await this.handleFundsReleased(signature, logs);
      } else if (log.includes("DisputeRaised")) {
        await this.handleDisputeRaised(signature);
      } else if (log.includes("MilestoneApproved")) {
        await this.handleMilestoneApproved(signature);
      }
    }
  }

  private async handleVaultCreated(signature: string, _logs: string[]): Promise<void> {
    logger.info({ signature }, "VaultCreated event detected");
    await supabase.from("transactions").upsert(
      { tx_signature: signature, tx_type: "create", metadata: { event: "VaultCreated" } },
      { onConflict: "tx_signature" },
    );
  }

  private async handleFundsReleased(signature: string, _logs: string[]): Promise<void> {
    logger.info({ signature }, "FundsReleased event detected");
    await supabase.from("transactions").upsert(
      { tx_signature: signature, tx_type: "release", metadata: { event: "FundsReleased" } },
      { onConflict: "tx_signature" },
    );
  }

  private async handleDisputeRaised(signature: string): Promise<void> {
    logger.info({ signature }, "DisputeRaised event detected");
  }

  private async handleMilestoneApproved(signature: string): Promise<void> {
    logger.info({ signature }, "MilestoneApproved event detected");
  }
}
