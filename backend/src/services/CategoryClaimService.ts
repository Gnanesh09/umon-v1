import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { env } from "../config/env.js";
import { connection, programId } from "../lib/solana.js";
import { logger } from "../lib/logger.js";
import * as fs from "fs";

const USDC_DEVNET_MINT = new PublicKey(
  process.env.TOKEN_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);

export class CategoryClaimService {
  private keypair: Keypair | null = null;
  private program: Program | null = null;

  init(): boolean {
    if (!env.AUTHORITY_KEYPAIR) {
      logger.warn("AUTHORITY_KEYPAIR not set, CategoryClaimService unavailable");
      return false;
    }

    try {
      this.keypair = this.loadKeypair(env.AUTHORITY_KEYPAIR);
    } catch (e) {
      logger.error({ err: e }, "Failed to load AUTHORITY_KEYPAIR for CategoryClaimService");
      return false;
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
      logger.warn("IDL not found, CategoryClaimService unavailable");
      return false;
    }

    logger.info("CategoryClaimService initialized");
    return true;
  }

  isReady(): boolean {
    return this.keypair !== null && this.program !== null;
  }

  async releaseCategoryRestrict(
    onChainId: string,
    recipientWallet: string,
    conditionIndex: number,
  ): Promise<string> {
    if (!this.keypair || !this.program) {
      throw new Error("CategoryClaimService not initialized");
    }

    const vaultPda = new PublicKey(onChainId);
    const [vaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority"), vaultPda.toBuffer()],
      programId,
    );

    const vaultAta = await getAssociatedTokenAddress(USDC_DEVNET_MINT, vaultAuthority, true);
    const recipientPk = new PublicKey(recipientWallet);
    const recipientAta = await this.ensureAta(recipientPk, USDC_DEVNET_MINT);

    const sig = await this.program.methods
      .releaseCategoryRestrict(conditionIndex)
      .accounts({
        authority: this.keypair.publicKey,
        vault: vaultPda,
        vaultAuthority,
        vaultTokenAccount: vaultAta,
        recipientTokenAccount: recipientAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    logger.info({ sig, vaultPda: onChainId, conditionIndex }, "On-chain category release executed");
    return sig;
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
