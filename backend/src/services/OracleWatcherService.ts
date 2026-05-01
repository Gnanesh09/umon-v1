import { Queue, Worker, type Job } from "bullmq";
import { Connection, PublicKey } from "@solana/web3.js";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { connection, programId } from "../lib/solana.js";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";

type OracleJob = { vaultId: string; onChainId: string; conditionIndex: number; observedValue: number; feed: string };

export class OracleWatcherService {
  private queue: Queue<OracleJob> | null = null;
  private worker: Worker<OracleJob> | null = null;
  private redis: Redis | null = null;

  async start(): Promise<void> {
    if (!env.REDIS_URL) {
      logger.warn("REDIS_URL not set, OracleWatcherService disabled");
      return;
    }

    this.redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.queue = new Queue<OracleJob>("oracle-watcher", {
      connection: this.redis,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 3000 } },
    });

    await this.queue.add(
      "scan",
      { vaultId: "scan", onChainId: "scan", conditionIndex: 0, observedValue: 0, feed: "" },
      { repeat: { every: 5 * 60 * 1000 }, removeOnComplete: true, jobId: "oracle-scan-repeat" },
    );

    this.worker = new Worker<OracleJob>(
      "oracle-watcher",
      async (job: Job<OracleJob>) => {
        if (job.data.vaultId === "scan") {
          await this.scanAndEnqueue();
          return;
        }
        await this.executeTrigger(job.data);
      },
      { connection: this.redis },
    );

    this.worker.on("failed", (job, err) => {
      logger.error({ jobId: job?.id, err }, "Oracle job failed");
    });

    logger.info("OracleWatcherService started");
  }

  private async scanAndEnqueue(): Promise<void> {
    if (!this.queue) return;

    const { data } = await supabase
      .from("vaults")
      .select("id,on_chain_id,conditions")
      .in("status", ["active", "partially_released"]);

    for (const vault of data ?? []) {
      const conditions = (vault.conditions ?? []) as Array<Record<string, unknown>>;
      for (const [index, condition] of conditions.entries()) {
        if (condition.type !== "oracle") continue;

        try {
          const observedValue = await this.fetchOracleValue(String(condition.feed));
          const threshold = Number(condition.threshold ?? 0);
          const operator = String(condition.operator ?? "eq");
          const matched = this.compare(observedValue, threshold, operator);

          if (matched) {
            await this.queue.add(
              "trigger",
              {
                vaultId: vault.id,
                onChainId: vault.on_chain_id,
                conditionIndex: index,
                observedValue,
                feed: String(condition.feed),
              },
              { jobId: `oracle-trigger-${vault.id}-${index}`, removeOnComplete: true },
            );
          }
        } catch (error) {
          logger.error({ err: error, vaultId: vault.id }, "Failed to check oracle condition");
        }
      }
    }
  }

  private async fetchOracleValue(feedAddress: string): Promise<number> {
    try {
      const feedPubkey = new PublicKey(feedAddress);
      const accountInfo = await connection.getAccountInfo(feedPubkey);
      if (!accountInfo?.data) {
        logger.warn({ feed: feedAddress }, "Oracle feed account not found, falling back to slot");
        return await connection.getSlot("confirmed");
      }
      const data = accountInfo.data;
      if (data.length >= 216) {
        const priceRaw = data.readBigInt64LE(208);
        const exponent = data.readInt32LE(20);
        const price = Number(priceRaw) * Math.pow(10, exponent);
        return Math.round(price * 100) / 100;
      }
      return await connection.getSlot("confirmed");
    } catch (error) {
      logger.error({ err: error, feed: feedAddress }, "Failed to fetch oracle value");
      return await connection.getSlot("confirmed");
    }
  }

  private compare(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case "lt": return value < threshold;
      case "gt": return value > threshold;
      case "eq": return value === threshold;
      case "lte": return value <= threshold;
      case "gte": return value >= threshold;
      default: return false;
    }
  }

  private async executeTrigger(job: OracleJob): Promise<void> {
    try {
      await supabase
        .from("vaults")
        .update({ status: "partially_released", updated_at: new Date().toISOString() })
        .eq("id", job.vaultId);

      await supabase.from("transactions").insert({
        vault_id: job.vaultId,
        tx_signature: `oracle-${Date.now()}-${job.vaultId}`,
        tx_type: "oracle_trigger",
        amount_usdc: null,
        condition_type: "oracle",
        metadata: { conditionIndex: job.conditionIndex, observedValue: job.observedValue, feed: job.feed },
      });

      logger.info({ vaultId: job.vaultId, value: job.observedValue }, "Oracle trigger recorded");
    } catch (error) {
      logger.error({ err: error }, "Oracle trigger failed");
      throw error;
    }
  }
}
