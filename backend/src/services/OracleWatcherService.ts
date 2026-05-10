import { Queue, Worker, type Job } from "bullmq";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { Redis } from "ioredis";
import * as fs from "fs";
import { env } from "../config/env.js";
import { connection, programId } from "../lib/solana.js";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { ReceiptService } from "./ReceiptService.js";

const USDC_DEVNET_MINT = new PublicKey(
  process.env.TOKEN_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);

type OracleJob = { vaultId: string; onChainId: string; conditionIndex: number; observedValue: number; feed: string };

type VaultRow = {
  id: string;
  on_chain_id: string;
  creator_wallet: string;
  recipient_wallet: string;
  amount_usdc: number;
  released_amount_usdc: number;
  status: string;
  conditions: Array<Record<string, unknown>>;
};

export class OracleWatcherService {
  private queue: Queue<OracleJob> | null = null;
  private worker: Worker<OracleJob> | null = null;
  private redis: Redis | null = null;
  private keypair: Keypair | null = null;
  private program: Program | null = null;
  private receiptService = new ReceiptService();

  async start(): Promise<void> {
    if (!env.REDIS_URL) {
      logger.warn("REDIS_URL not set, OracleWatcherService disabled");
      return;
    }

    if (!env.AUTHORITY_KEYPAIR) {
      logger.warn("AUTHORITY_KEYPAIR not set, OracleWatcherService disabled (needed for on-chain triggers)");
      return;
    }

    try {
      this.keypair = this.loadKeypair(env.AUTHORITY_KEYPAIR);
      logger.info({ authority: this.keypair.publicKey.toBase58() }, "OracleWatcherService authority loaded");
    } catch (e) {
      logger.error({ err: e }, "Failed to load AUTHORITY_KEYPAIR for OracleWatcherService");
      return;
    }

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: this.keypair.publicKey,
        signAllTransactions: async <T extends import("@solana/web3.js").Transaction | import("@solana/web3.js").VersionedTransaction>(txs: T[]): Promise<T[]> => {
          for (const tx of txs) {
            if ("partialSign" in tx) (tx as import("@solana/web3.js").Transaction).partialSign(this.keypair!);
          }
          return txs;
        },
        signTransaction: async <T extends import("@solana/web3.js").Transaction | import("@solana/web3.js").VersionedTransaction>(tx: T): Promise<T> => {
          if ("partialSign" in tx) (tx as import("@solana/web3.js").Transaction).partialSign(this.keypair!);
          return tx;
        },
      },
      { commitment: "confirmed" },
    );

    try {
      const idlPath = new URL("../../idl/powermoney.json", import.meta.url);
      const idlRaw = fs.readFileSync(idlPath, "utf8");
      this.program = new Program(JSON.parse(idlRaw) as Idl, provider);
    } catch {
      logger.warn("IDL not found at backend/idl/powermoney.json, OracleWatcherService disabled");
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
      .select("*")
      .in("status", ["active", "partially_released"]);

    for (const vault of (data ?? []) as VaultRow[]) {
      const conditions = (vault.conditions ?? []) as Array<Record<string, unknown>>;
      for (const [index, condition] of conditions.entries()) {
        if (condition.type !== "oracle") continue;

        const alreadyTriggered = await this.hasTransaction(vault.id, index, "oracle_trigger");
        if (alreadyTriggered) continue;

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
            logger.info({ vaultId: vault.id, index, observedValue, threshold, operator }, "Oracle condition matched, enqueued trigger");
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
        logger.warn({ feed: feedAddress }, "Oracle feed account not found");
        throw new Error(`Oracle feed account not found: ${feedAddress}`);
      }
      const data = accountInfo.data;
      if (data.length >= 216) {
        const priceRaw = data.readBigInt64LE(208);
        const exponent = data.readInt32LE(20);
        const price = Number(priceRaw) * Math.pow(10, exponent);
        return Math.round(price * 100) / 100;
      }
      throw new Error(`Oracle feed data too short (${data.length} bytes): ${feedAddress}`);
    } catch (error) {
      logger.error({ err: error, feed: feedAddress }, "Failed to fetch oracle value");
      throw error;
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
    if (!this.program || !this.keypair) {
      throw new Error("OracleWatcherService not initialized");
    }

    const alreadyTriggered = await this.hasTransaction(job.vaultId, job.conditionIndex, "oracle_trigger");
    if (alreadyTriggered) {
      logger.info({ vaultId: job.vaultId, conditionIndex: job.conditionIndex }, "Oracle already triggered, skipping");
      return;
    }

    const { data: vault } = await supabase.from("vaults").select("*").eq("id", job.vaultId).single();
    if (!vault) {
      logger.warn({ vaultId: job.vaultId }, "Vault not found for oracle trigger");
      return;
    }

    const vaultRow = vault as VaultRow;
    const vaultPda = new PublicKey(vaultRow.on_chain_id);
    const [vaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority"), vaultPda.toBuffer()],
      programId,
    );
    const vaultAta = await getAssociatedTokenAddress(USDC_DEVNET_MINT, vaultAuthority, true);
    const recipientPk = new PublicKey(vaultRow.recipient_wallet);
    const recipientAta = await this.ensureAta(recipientPk, USDC_DEVNET_MINT);
    const oracleFeed = new PublicKey(job.feed);

    logger.info({ vaultId: job.vaultId, conditionIndex: job.conditionIndex, observedValue: job.observedValue }, "Executing on-chain oracle trigger");

    const sig = await this.program.methods
      .triggerOracle(job.conditionIndex, job.observedValue)
      .accounts({
        authority: this.keypair.publicKey,
        vault: vaultPda,
        oracleFeed,
        vaultAuthority,
        vaultTokenAccount: vaultAta,
        recipientTokenAccount: recipientAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const condition = vaultRow.conditions[job.conditionIndex];
    const percentage = Number(condition?.percentage ?? 0);
    const releaseAmount = Math.floor((vaultRow.amount_usdc * percentage) / 100);

    await supabase.from("transactions").insert({
      vault_id: job.vaultId,
      tx_signature: sig,
      tx_type: "oracle_trigger",
      amount_usdc: releaseAmount,
      from_wallet: vaultRow.on_chain_id,
      to_wallet: vaultRow.recipient_wallet,
      condition_type: "oracle",
      metadata: { conditionIndex: job.conditionIndex, observedValue: job.observedValue, feed: job.feed },
    });

    const newReleased = vaultRow.released_amount_usdc + releaseAmount;
    const newStatus = newReleased >= vaultRow.amount_usdc ? "released" : "partially_released";
    await supabase
      .from("vaults")
      .update({ released_amount_usdc: newReleased, status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", job.vaultId);

    this.receiptService.create({
      vaultId: job.vaultId,
      walletAddress: vaultRow.creator_wallet,
      txSignature: sig,
      receiptType: "funds_released",
      amountUsdc: releaseAmount,
      recipientWallet: vaultRow.recipient_wallet,
      description: `Oracle trigger condition #${job.conditionIndex} — value ${job.observedValue}`,
      metadata: { conditionIndex: job.conditionIndex, conditionType: "oracle", auto: true, observedValue: job.observedValue },
    }).catch((e) => logger.error({ err: e }, "Failed to create oracle trigger receipt"));

    logger.info({ vaultId: job.vaultId, sig, amount: releaseAmount, observedValue: job.observedValue }, "Oracle trigger executed on-chain");
  }

  private async hasTransaction(vaultId: string, conditionIndex: number, txType: string): Promise<boolean> {
    const { data } = await supabase
      .from("transactions")
      .select("id, metadata")
      .eq("vault_id", vaultId)
      .eq("tx_type", txType);
    return (data ?? []).some((row) => {
      const meta = row.metadata as Record<string, unknown> | null;
      return meta?.conditionIndex === conditionIndex;
    });
  }

  private async ensureAta(owner: PublicKey, mint: PublicKey): Promise<PublicKey> {
    const ata = await getAssociatedTokenAddress(mint, owner, true);
    try {
      await getAccount(connection, ata);
      return ata;
    } catch {
      // Create ATA
    }
    const ix = createAssociatedTokenAccountInstruction(this.keypair!.publicKey, ata, owner, mint);
    const tx = new Transaction().add(ix);
    tx.feePayer = this.keypair!.publicKey;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.partialSign(this.keypair!);
    const sig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    return ata;
  }

  private loadKeypair(value: string): Keypair {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      const arr = JSON.parse(trimmed) as number[];
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    }
    try {
      const raw = fs.readFileSync(trimmed, "utf8");
      const arr = JSON.parse(raw) as number[];
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    } catch {
      const { default: bs58 } = require("bs58") as { default: { decode: (s: string) => Uint8Array } };
      return Keypair.fromSecretKey(bs58.decode(trimmed));
    }
  }
}
