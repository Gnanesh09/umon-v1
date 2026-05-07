import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";
import { env } from "../config/env.js";
import { connection, programId } from "../lib/solana.js";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { ReceiptService } from "./ReceiptService.js";
import * as fs from "fs";

const USDC_DEVNET_MINT = new PublicKey(
  process.env.TOKEN_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);
const SCAN_INTERVAL_MS = 60_000;

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

export class AutoReleaserService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private keypair: Keypair | null = null;
  private provider: AnchorProvider | null = null;
  private program: Program | null = null;
  private receiptService = new ReceiptService();

  async start(): Promise<void> {
    if (!env.AUTHORITY_KEYPAIR) {
      logger.warn("AUTHORITY_KEYPAIR not set, AutoReleaserService disabled. Set it to a JSON keypair path or base58 secret key.");
      return;
    }

    try {
      this.keypair = this.loadKeypair(env.AUTHORITY_KEYPAIR);
      logger.info({ authority: this.keypair.publicKey.toBase58() }, "AutoReleaserService authority loaded");
    } catch (e) {
      logger.error({ err: e }, "Failed to load AUTHORITY_KEYPAIR");
      return;
    }

    this.provider = new AnchorProvider(
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
      this.program = new Program(JSON.parse(idlRaw) as Idl, this.provider);
    } catch {
      logger.warn("IDL not found at backend/idl/powermoney.json, AutoReleaserService disabled");
      return;
    }

    this.intervalId = setInterval(() => {
      void this.scan();
    }, SCAN_INTERVAL_MS);

    void this.scan();
    logger.info({ intervalMs: SCAN_INTERVAL_MS }, "AutoReleaserService started");
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private loadKeypair(value: string): Keypair {
    const trimmed = value.trim();

    // Direct JSON array: [12,34,56,...]
    if (trimmed.startsWith("[")) {
      const arr = JSON.parse(trimmed) as number[];
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    }

    // File path
    try {
      const raw = fs.readFileSync(trimmed, "utf8");
      const arr = JSON.parse(raw) as number[];
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    } catch {
      // Try as base58
      const { default: bs58 } = require("bs58") as { default: { decode: (s: string) => Uint8Array } };
      return Keypair.fromSecretKey(bs58.decode(trimmed));
    }
  }

  private async scan(): Promise<void> {
    try {
      const { data: vaults } = await supabase
        .from("vaults")
        .select("*")
        .in("status", ["active", "partially_released"]);

      if (!vaults || vaults.length === 0) return;

      const now = Date.now();

      for (const vault of vaults as VaultRow[]) {
        for (const [index, condition] of vault.conditions.entries()) {
          try {
            if (condition.type === "time_lock") {
              await this.handleTimeLock(vault, index, condition, now);
            } else if (condition.type === "auto_split") {
              await this.handleAutoSplit(vault, index, condition);
            }
          } catch (error) {
            logger.error({ err: error, vaultId: vault.id, conditionIndex: index }, "Auto-release failed for condition");
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, "AutoReleaserService scan failed");
    }
  }

  private async handleTimeLock(
    vault: VaultRow,
    conditionIndex: number,
    condition: Record<string, unknown>,
    now: number,
  ): Promise<void> {
    const releaseTime = new Date(condition.releaseTime as string).getTime();
    if (now < releaseTime) return;

    const alreadyReleased = await this.hasTransaction(vault.id, conditionIndex, "release");
    if (alreadyReleased) return;

    logger.info({ vaultId: vault.id, conditionIndex }, "Auto-releasing time-locked funds");

    const vaultPda = new PublicKey(vault.on_chain_id);
    const [vaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority"), vaultPda.toBuffer()],
      programId,
    );

    const vaultAta = await getAssociatedTokenAddress(USDC_DEVNET_MINT, vaultAuthority, true);
    const recipientPk = new PublicKey(vault.recipient_wallet);
    const recipientAta = await this.ensureAta(recipientPk, USDC_DEVNET_MINT);

    const sig = await this.program!.methods
      .releaseTimeLock(conditionIndex)
      .accounts({
        authority: this.keypair!.publicKey,
        vault: vaultPda,
        vaultAuthority,
        vaultTokenAccount: vaultAta,
        recipientTokenAccount: recipientAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const percentage = Number(condition.percentage ?? 0);
    const releaseAmount = Math.floor((vault.amount_usdc * percentage) / 100);

    await supabase.from("transactions").insert({
      vault_id: vault.id,
      tx_signature: sig,
      tx_type: "release",
      amount_usdc: releaseAmount,
      from_wallet: vault.on_chain_id,
      to_wallet: vault.recipient_wallet,
      condition_type: "time_lock",
      metadata: { conditionIndex },
    });

    const newReleased = vault.released_amount_usdc + releaseAmount;
    const newStatus = newReleased >= vault.amount_usdc ? "released" : "partially_released";
    await supabase
      .from("vaults")
      .update({ released_amount_usdc: newReleased, status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", vault.id);

    this.receiptService.create({
      vaultId: vault.id,
      walletAddress: vault.creator_wallet,
      txSignature: sig,
      receiptType: "funds_released",
      amountUsdc: releaseAmount,
      recipientWallet: vault.recipient_wallet,
      description: `Auto-released time-lock condition #${conditionIndex}`,
      metadata: { conditionIndex, conditionType: "time_lock", auto: true },
    }).catch((e) => logger.error({ err: e }, "Failed to create auto-release receipt"));

    logger.info({ vaultId: vault.id, sig, amount: releaseAmount }, "Time-lock auto-released");
  }

  private async handleAutoSplit(
    vault: VaultRow,
    conditionIndex: number,
    condition: Record<string, unknown>,
  ): Promise<void> {
    const alreadyExecuted = await this.hasTransaction(vault.id, conditionIndex, "split");
    if (alreadyExecuted) return;

    const splits = (condition.splits ?? []) as Array<{ wallet: string; percentage: number }>;
    if (splits.length === 0) return;

    logger.info({ vaultId: vault.id, conditionIndex }, "Auto-executing split");

    const vaultPda = new PublicKey(vault.on_chain_id);
    const [vaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority"), vaultPda.toBuffer()],
      programId,
    );

    const vaultAta = await getAssociatedTokenAddress(USDC_DEVNET_MINT, vaultAuthority, true);

    const remainingAccounts = [];
    for (const split of splits) {
      const recipientPk = new PublicKey(split.wallet);
      const ata = await this.ensureAta(recipientPk, USDC_DEVNET_MINT);
      remainingAccounts.push({ pubkey: ata, isSigner: false, isWritable: true });
    }

    const sig = await this.program!.methods
      .executeSplit(conditionIndex)
      .accounts({
        authority: this.keypair!.publicKey,
        vault: vaultPda,
        vaultAuthority,
        vaultTokenAccount: vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();

    await supabase.from("transactions").insert({
      vault_id: vault.id,
      tx_signature: sig,
      tx_type: "split",
      condition_type: "auto_split",
      metadata: { conditionIndex, splits },
    });

    await supabase
      .from("vaults")
      .update({ status: "released", updated_at: new Date().toISOString() })
      .eq("id", vault.id);

    this.receiptService.create({
      vaultId: vault.id,
      walletAddress: vault.creator_wallet,
      txSignature: sig,
      receiptType: "split_executed",
      amountUsdc: Number(vault.amount_usdc),
      recipientWallet: vault.recipient_wallet,
      description: `Auto-executed split condition #${conditionIndex}`,
      metadata: { conditionIndex, conditionType: "auto_split", auto: true, splits },
    }).catch((e) => logger.error({ err: e }, "Failed to create auto-split receipt"));

    logger.info({ vaultId: vault.id, sig }, "Auto-split executed");
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
}
