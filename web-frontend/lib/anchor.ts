import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  type TransactionSignature,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
} from "@solana/spl-token";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { PROGRAM_ID, USDC_DEVNET_MINT, SOLANA_RPC_URL, TREASURY_WALLET, calculateFee } from "./constants";
import IDL from "./idl.json";

let cachedConnection: Connection | null = null;

function getConnection(): Connection {
  if (!cachedConnection) {
    cachedConnection = new Connection(SOLANA_RPC_URL, "confirmed");
  }
  return cachedConnection;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getProgram(wallet: AnchorWallet): Program<any> {
  const connection = getConnection();
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  return new Program(IDL as Idl, provider);
}

function deriveVaultPda(id: Uint8Array): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), Buffer.from(id)],
    PROGRAM_ID,
  );
  return pda;
}

function deriveVaultAuthority(vaultPda: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault-authority"), vaultPda.toBuffer()],
    PROGRAM_ID,
  );
  return pda;
}

function deriveDisputePda(vaultPda: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("dispute"), vaultPda.toBuffer()],
    PROGRAM_ID,
  );
  return pda;
}

async function ensureAta(
  connection: Connection,
  wallet: AnchorWallet,
  owner: PublicKey,
  mint: PublicKey,
): Promise<PublicKey> {
  const ata = await getAssociatedTokenAddress(mint, owner, true);
  try {
    await getAccount(connection, ata);
    return ata;
  } catch {
    // ATA doesn't exist, create it
  }
  try {
    const ix = createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      ata,
      owner,
      mint,
    );
    const { Transaction } = await import("@solana/web3.js");
    const tx = new Transaction().add(ix);
    tx.feePayer = wallet.publicKey;
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    const signed = await wallet.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed",
    );
  } catch (e) {
    // ATA may have been created by a concurrent attempt — verify it exists
    try {
      await getAccount(connection, ata);
    } catch {
      throw e;
    }
  }
  return ata;
}

export type OnChainCondition =
  | { timeLock: { releaseTime: BN; percentage: number } }
  | {
      milestoneApproval: {
        description: string;
        requiredApprovers: PublicKey[];
        approvalsReceived: PublicKey[];
        percentage: number;
        completed: boolean;
      };
    }
  | {
      autoSplit: {
        splits: Array<{ wallet: PublicKey; percentage: number }>;
      };
    }
  | {
      oracleTrigger: {
        oracleFeed: PublicKey;
        operator: Record<string, Record<string, never>>;
        threshold: BN;
        percentage: number;
        triggered: boolean;
      };
    }
  | {
      categoryRestrict: {
        merchantRegistry: PublicKey;
        allowedCategories: string[];
        percentage: number;
      };
    };

const OPERATOR_MAP: Record<string, Record<string, Record<string, never>>> = {
  lt: { lessThan: {} },
  gt: { greaterThan: {} },
  eq: { equal: {} },
  lte: { lessThanOrEqual: {} },
  gte: { greaterThanOrEqual: {} },
};

export interface CreateVaultParams {
  recipient: PublicKey;
  amountUsdc: number;
  description: string;
  conditions: Array<{
    type: "time_lock" | "milestone" | "auto_split" | "oracle" | "category";
    releaseTime?: string;
    percentage?: number;
    description?: string;
    approvers?: string[];
    splits?: Array<{ wallet: string; percentage: number }>;
    feed?: string;
    operator?: string;
    threshold?: number;
    merchantRegistry?: string;
    categories?: string[];
  }>;
}

function buildConditions(
  conditions: CreateVaultParams["conditions"],
): OnChainCondition[] {
  return conditions.map((c) => {
    switch (c.type) {
      case "time_lock":
        return {
          timeLock: {
            releaseTime: new BN(
              Math.floor(new Date(c.releaseTime!).getTime() / 1000),
            ),
            percentage: c.percentage!,
          },
        };
      case "milestone":
        return {
          milestoneApproval: {
            description: c.description ?? "",
            requiredApprovers: (c.approvers ?? []).map(
              (a) => new PublicKey(a),
            ),
            approvalsReceived: [],
            percentage: c.percentage!,
            completed: false,
          },
        };
      case "auto_split":
        return {
          autoSplit: {
            splits: (c.splits ?? []).map((s) => ({
              wallet: new PublicKey(s.wallet),
              percentage: s.percentage,
            })),
          },
        };
      case "oracle":
        return {
          oracleTrigger: {
            oracleFeed: new PublicKey(c.feed!),
            operator: OPERATOR_MAP[c.operator ?? "gt"],
            threshold: new BN(c.threshold ?? 0),
            percentage: c.percentage!,
            triggered: false,
          },
        };
      case "category":
        return {
          categoryRestrict: {
            merchantRegistry: new PublicKey(c.merchantRegistry!),
            allowedCategories: c.categories ?? [],
            percentage: c.percentage!,
          },
        };
    }
  });
}

export async function createVaultOnChain(
  wallet: AnchorWallet,
  params: CreateVaultParams,
): Promise<{ vaultAddress: PublicKey; txSignature: TransactionSignature; vaultId: number[]; feeAmountLamports: number }> {
  const program = getProgram(wallet);
  const connection = getConnection();

  const seed = crypto.getRandomValues(new Uint8Array(32));
  const vaultPda = deriveVaultPda(seed);
  const vaultAuthority = deriveVaultAuthority(vaultPda);

  const feeAmount = calculateFee(params.amountUsdc);
  const totalRequired = params.amountUsdc + feeAmount;

  const creatorAta = await ensureAta(
    connection,
    wallet,
    wallet.publicKey,
    USDC_DEVNET_MINT,
  );

  try {
    const account = await getAccount(connection, creatorAta);
    const balance = Number(account.amount);
    if (balance < totalRequired) {
      const balanceUsdc = (balance / 1_000_000).toFixed(2);
      const amountUsdc = (params.amountUsdc / 1_000_000).toFixed(2);
      const feeUsdc = (feeAmount / 1_000_000).toFixed(4);
      const totalUsdc = (totalRequired / 1_000_000).toFixed(4);
      throw new Error(
        `Insufficient USDC balance. You have ${balanceUsdc} USDC but need ${totalUsdc} USDC (${amountUsdc} + ${feeUsdc} fee).`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("Insufficient USDC")) throw e;
    throw new Error(
      "No USDC token account found. You need devnet USDC tokens to create a vault.",
    );
  }

  const vaultAta = await ensureAta(connection, wallet, vaultAuthority, USDC_DEVNET_MINT);
  const treasuryAta = await ensureAta(connection, wallet, TREASURY_WALLET, USDC_DEVNET_MINT);

  const amountLamports = new BN(params.amountUsdc);
  const onChainConditions = buildConditions(params.conditions);

  // Build the fee transfer instruction
  const feeIx = createTransferInstruction(
    creatorAta,
    treasuryAta,
    wallet.publicKey,
    BigInt(feeAmount),
  );

  // Build the create vault instruction
  // @ts-expect-error - Anchor method chain types are excessively deep
  const createVaultIx = await program.methods
    .createVault(
      Array.from(seed),
      amountLamports,
      params.description,
      onChainConditions as never,
    )
    .accounts({
      creator: wallet.publicKey,
      recipient: params.recipient,
      vault: vaultPda,
      vaultAuthority,
      creatorTokenAccount: creatorAta,
      vaultTokenAccount: vaultAta,
      mint: USDC_DEVNET_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  // Bundle both into one atomic transaction — user signs once
  const { Transaction } = await import("@solana/web3.js");
  const bs58 = await import("bs58").then((m) => m.default);
  const tx = new Transaction().add(feeIx).add(createVaultIx);
  tx.feePayer = wallet.publicKey;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  const signed = await wallet.signTransaction(tx);

  // Extract signature before sending — so we have it even if send throws "already processed"
  const sigBytes = signed.signature;
  if (!sigBytes) throw new Error("Transaction was not properly signed");
  const txSignature = bs58.encode(sigBytes);

  try {
    await connection.sendRawTransaction(signed.serialize(), { maxRetries: 3 });
  } catch (sendErr: unknown) {
    const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
    // "Already processed" means the tx already landed on-chain — safe to continue
    if (!errMsg.includes("already been processed") && !errMsg.includes("AlreadyProcessed")) {
      throw sendErr;
    }
  }

  await connection.confirmTransaction(
    { signature: txSignature, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  return { vaultAddress: vaultPda, txSignature, vaultId: Array.from(seed), feeAmountLamports: feeAmount };
}

export async function releaseTimeLockOnChain(
  wallet: AnchorWallet,
  vaultAddress: PublicKey,
  recipientAddress: PublicKey,
  conditionIndex: number,
): Promise<TransactionSignature> {
  const program = getProgram(wallet);
  const connection = getConnection();
  const vaultAuthority = deriveVaultAuthority(vaultAddress);
  const vaultAta = await getAssociatedTokenAddress(
    USDC_DEVNET_MINT,
    vaultAuthority,
    true,
  );
  const recipientAta = await ensureAta(
    connection,
    wallet,
    recipientAddress,
    USDC_DEVNET_MINT,
  );

  return program.methods
    .releaseTimeLock(conditionIndex)
    .accounts({
      authority: wallet.publicKey,
      vault: vaultAddress,
      vaultAuthority,
      vaultTokenAccount: vaultAta,
      recipientTokenAccount: recipientAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

export async function approveMilestoneOnChain(
  wallet: AnchorWallet,
  vaultAddress: PublicKey,
  recipientAddress: PublicKey,
  conditionIndex: number,
): Promise<TransactionSignature> {
  const program = getProgram(wallet);
  const connection = getConnection();
  const vaultAuthority = deriveVaultAuthority(vaultAddress);
  const vaultAta = await getAssociatedTokenAddress(
    USDC_DEVNET_MINT,
    vaultAuthority,
    true,
  );
  const recipientAta = await ensureAta(
    connection,
    wallet,
    recipientAddress,
    USDC_DEVNET_MINT,
  );

  return program.methods
    .approveMilestone(conditionIndex)
    .accounts({
      approver: wallet.publicKey,
      vault: vaultAddress,
      vaultAuthority,
      vaultTokenAccount: vaultAta,
      recipientTokenAccount: recipientAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

export async function executeSplitOnChain(
  wallet: AnchorWallet,
  vaultAddress: PublicKey,
  conditionIndex: number,
  splitRecipients: PublicKey[],
): Promise<TransactionSignature> {
  const program = getProgram(wallet);
  const connection = getConnection();
  const vaultAuthority = deriveVaultAuthority(vaultAddress);
  const vaultAta = await getAssociatedTokenAddress(
    USDC_DEVNET_MINT,
    vaultAuthority,
    true,
  );

  const remainingAccounts = [];
  for (const recipient of splitRecipients) {
    const ata = await ensureAta(
      connection,
      wallet,
      recipient,
      USDC_DEVNET_MINT,
    );
    remainingAccounts.push({
      pubkey: ata,
      isSigner: false,
      isWritable: true,
    });
  }

  return program.methods
    .executeSplit(conditionIndex)
    .accounts({
      authority: wallet.publicKey,
      vault: vaultAddress,
      vaultAuthority,
      vaultTokenAccount: vaultAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .rpc();
}

export async function cancelVaultOnChain(
  wallet: AnchorWallet,
  vaultAddress: PublicKey,
): Promise<TransactionSignature> {
  const program = getProgram(wallet);
  const vaultAuthority = deriveVaultAuthority(vaultAddress);
  const vaultAta = await getAssociatedTokenAddress(
    USDC_DEVNET_MINT,
    vaultAuthority,
    true,
  );
  const creatorAta = await getAssociatedTokenAddress(
    USDC_DEVNET_MINT,
    wallet.publicKey,
  );

  return program.methods
    .cancelVault()
    .accounts({
      creator: wallet.publicKey,
      vault: vaultAddress,
      vaultAuthority,
      vaultTokenAccount: vaultAta,
      creatorTokenAccount: creatorAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

export async function raiseDisputeOnChain(
  wallet: AnchorWallet,
  vaultAddress: PublicKey,
  reason: string,
  jurors: PublicKey[],
): Promise<TransactionSignature> {
  const program = getProgram(wallet);
  const disputePda = deriveDisputePda(vaultAddress);

  return program.methods
    .raiseDispute(reason, jurors)
    .accounts({
      plaintiff: wallet.publicKey,
      vault: vaultAddress,
      dispute: disputePda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function fetchVaultOnChain(
  wallet: AnchorWallet,
  vaultAddress: PublicKey,
): Promise<Record<string, unknown> | null> {
  try {
    const program = getProgram(wallet);
    const account = await (program.account as any).paymentVault.fetch(vaultAddress);
    return account as Record<string, unknown>;
  } catch {
    return null;
  }
}
