import {
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
} from "@solana/spl-token";
import { connection } from "../lib/solana.js";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { encryptSecret, decryptSecret, hashToken, generateToken } from "../lib/crypto.js";
import { AppError } from "../utils/errors.js";

const USDC_MINT = new PublicKey(
  process.env.TOKEN_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);

type CreateAgentInput = {
  ownerWallet: string;
  name: string;
  description?: string;
  dailyLimitUsdc?: number;
  perTxLimitUsdc?: number;
  allowedCategories?: string[];
  allowedRecipients?: string[];
};

type AgentWalletRow = {
  id: string;
  owner_wallet: string;
  name: string;
  description: string | null;
  public_key: string;
  encrypted_secret_key: string;
  encryption_iv: string;
  encryption_tag: string;
  daily_limit_usdc: number;
  per_tx_limit_usdc: number;
  allowed_categories: string[];
  allowed_recipients: string[];
  total_funded_usdc: number;
  total_spent_usdc: number;
  spent_today_usdc: number;
  last_spend_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type PayInput = {
  agentWalletId: string;
  toWallet: string;
  amountUsdc: number;
  memo?: string;
};

type GuardrailResult = {
  passed: boolean;
  checks: Record<string, { passed: boolean; detail: string }>;
};

export class AgentWalletService {
  async create(input: CreateAgentInput): Promise<{ wallet: AgentWalletRow; apiToken: string }> {
    const keypair = Keypair.generate();
    const encrypted = encryptSecret(keypair.secretKey);

    const { data, error } = await supabase
      .from("agent_wallets")
      .insert({
        owner_wallet: input.ownerWallet,
        name: input.name,
        description: input.description ?? null,
        public_key: keypair.publicKey.toBase58(),
        encrypted_secret_key: encrypted.ciphertext,
        encryption_iv: encrypted.iv,
        encryption_tag: encrypted.tag,
        daily_limit_usdc: input.dailyLimitUsdc ?? 50_000_000,
        per_tx_limit_usdc: input.perTxLimitUsdc ?? 10_000_000,
        allowed_categories: input.allowedCategories ?? [],
        allowed_recipients: input.allowedRecipients ?? [],
      })
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to create agent wallet");
      throw new AppError("DB_ERROR", "Failed to create agent wallet", 500);
    }

    const token = generateToken();
    const { error: tokenErr } = await supabase.from("agent_api_tokens").insert({
      agent_wallet_id: data.id,
      token_hash: hashToken(token),
      token_prefix: token.slice(0, 8),
      label: "default",
    });

    if (tokenErr) {
      logger.error({ err: tokenErr }, "Failed to create agent API token");
    }

    logger.info(
      { agentId: data.id, publicKey: data.public_key, owner: input.ownerWallet },
      "Agent wallet created",
    );

    return { wallet: data as AgentWalletRow, apiToken: token };
  }

  async listByOwner(ownerWallet: string): Promise<AgentWalletRow[]> {
    const { data, error } = await supabase
      .from("agent_wallets")
      .select("*")
      .eq("owner_wallet", ownerWallet)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ err: error }, "Failed to list agent wallets");
      return [];
    }
    return (data ?? []) as AgentWalletRow[];
  }

  async getById(id: string): Promise<AgentWalletRow | null> {
    const { data } = await supabase
      .from("agent_wallets")
      .select("*")
      .eq("id", id)
      .single();
    return data as AgentWalletRow | null;
  }

  async getByApiToken(token: string): Promise<AgentWalletRow | null> {
    const hash = hashToken(token);
    const { data: tokenRow } = await supabase
      .from("agent_api_tokens")
      .select("agent_wallet_id, is_active, expires_at")
      .eq("token_hash", hash)
      .single();

    if (!tokenRow || !tokenRow.is_active) return null;
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) return null;

    await supabase
      .from("agent_api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token_hash", hash);

    return this.getById(tokenRow.agent_wallet_id);
  }

  async getBalance(publicKey: string): Promise<{ sol: number; usdc: number }> {
    const pubkey = new PublicKey(publicKey);
    const solBalance = await connection.getBalance(pubkey);

    let usdcBalance = 0;
    try {
      const ata = await getAssociatedTokenAddress(USDC_MINT, pubkey);
      const account = await getAccount(connection, ata);
      usdcBalance = Number(account.amount);
    } catch {
      // ATA doesn't exist yet
    }

    return {
      sol: solBalance / LAMPORTS_PER_SOL,
      usdc: usdcBalance,
    };
  }

  async pay(input: PayInput): Promise<{ txSignature: string; transactionId: string }> {
    const agent = await this.getById(input.agentWalletId);
    if (!agent) throw new AppError("NOT_FOUND", "Agent wallet not found", 404);
    if (agent.status !== "active") {
      throw new AppError("FORBIDDEN", `Agent wallet is ${agent.status}`, 403);
    }

    const onChainBalance = await this.getBalance(agent.public_key);
    const guardrail = this.validateGuardrails(agent, input, onChainBalance.usdc);
    if (!guardrail.passed) {
      const failedChecks = Object.entries(guardrail.checks)
        .filter(([, v]) => !v.passed)
        .map(([k, v]) => `${k}: ${v.detail}`)
        .join("; ");

      const { data: rejectedTx } = await supabase
        .from("agent_transactions")
        .insert({
          agent_wallet_id: input.agentWalletId,
          tx_type: "pay",
          amount_usdc: input.amountUsdc,
          to_wallet: input.toWallet,
          from_wallet: agent.public_key,
          memo: input.memo ?? null,
          status: "rejected",
          error_message: failedChecks,
          guardrail_check: guardrail.checks,
        })
        .select("id")
        .single();

      throw new AppError("GUARDRAIL_VIOLATION", failedChecks, 403, {
        checks: guardrail.checks,
        transactionId: rejectedTx?.id,
      });
    }

    const { data: txRow } = await supabase
      .from("agent_transactions")
      .insert({
        agent_wallet_id: input.agentWalletId,
        tx_type: "pay",
        amount_usdc: input.amountUsdc,
        to_wallet: input.toWallet,
        from_wallet: agent.public_key,
        memo: input.memo ?? null,
        status: "pending",
        guardrail_check: guardrail.checks,
      })
      .select("id")
      .single();

    if (!txRow) throw new AppError("DB_ERROR", "Failed to create transaction record", 500);

    try {
      const keypair = this.loadKeypair(agent);
      const txSignature = await this.executeSplTransfer(
        keypair,
        new PublicKey(input.toWallet),
        input.amountUsdc,
      );

      // Wipe secret key from memory
      keypair.secretKey.fill(0);

      await supabase
        .from("agent_transactions")
        .update({
          status: "completed",
          tx_signature: txSignature,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", txRow.id);

      await this.updateSpending(agent, input.amountUsdc);

      logger.info(
        { agentId: agent.id, txSig: txSignature, amount: input.amountUsdc, to: input.toWallet },
        "Agent payment executed",
      );

      return { txSignature, transactionId: txRow.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("agent_transactions")
        .update({ status: "failed", error_message: message })
        .eq("id", txRow.id);

      logger.error({ err, agentId: agent.id, txId: txRow.id }, "Agent payment failed");
      throw new AppError("TX_FAILED", `Transaction failed: ${message}`, 500);
    }
  }

  async freeze(id: string, ownerWallet: string): Promise<AgentWalletRow | null> {
    return this.updateStatus(id, ownerWallet, "frozen");
  }

  async unfreeze(id: string, ownerWallet: string): Promise<AgentWalletRow | null> {
    return this.updateStatus(id, ownerWallet, "active");
  }

  async revoke(id: string, ownerWallet: string): Promise<AgentWalletRow | null> {
    return this.updateStatus(id, ownerWallet, "revoked");
  }

  async updateLimits(
    id: string,
    ownerWallet: string,
    updates: { dailyLimitUsdc?: number; perTxLimitUsdc?: number; allowedCategories?: string[]; allowedRecipients?: string[] },
  ): Promise<AgentWalletRow | null> {
    const allowed: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.dailyLimitUsdc !== undefined) allowed.daily_limit_usdc = updates.dailyLimitUsdc;
    if (updates.perTxLimitUsdc !== undefined) allowed.per_tx_limit_usdc = updates.perTxLimitUsdc;
    if (updates.allowedCategories !== undefined) allowed.allowed_categories = updates.allowedCategories;
    if (updates.allowedRecipients !== undefined) allowed.allowed_recipients = updates.allowedRecipients;

    const { data, error } = await supabase
      .from("agent_wallets")
      .update(allowed)
      .eq("id", id)
      .eq("owner_wallet", ownerWallet)
      .select("*")
      .single();

    if (error) return null;
    return data as AgentWalletRow;
  }

  async listTransactions(agentWalletId: string, limit = 50): Promise<unknown[]> {
    const { data, error } = await supabase
      .from("agent_transactions")
      .select("*")
      .eq("agent_wallet_id", agentWalletId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ err: error }, "Failed to list agent transactions");
      return [];
    }
    return data ?? [];
  }

  async regenerateToken(agentWalletId: string, ownerWallet: string): Promise<string> {
    const agent = await this.getById(agentWalletId);
    if (!agent || agent.owner_wallet !== ownerWallet) {
      throw new AppError("NOT_FOUND", "Agent wallet not found", 404);
    }

    await supabase
      .from("agent_api_tokens")
      .update({ is_active: false })
      .eq("agent_wallet_id", agentWalletId);

    const token = generateToken();
    await supabase.from("agent_api_tokens").insert({
      agent_wallet_id: agentWalletId,
      token_hash: hashToken(token),
      token_prefix: token.slice(0, 8),
      label: "regenerated",
    });

    return token;
  }

  // ─── Private ────────────────────────────────────────────────────────

  private validateGuardrails(agent: AgentWalletRow, input: PayInput, onChainUsdc: number): GuardrailResult {
    const checks: GuardrailResult["checks"] = {};
    const today = new Date().toISOString().slice(0, 10);
    const spentToday = agent.last_spend_date === today ? agent.spent_today_usdc : 0;

    checks.per_tx_limit = {
      passed: input.amountUsdc <= agent.per_tx_limit_usdc,
      detail: input.amountUsdc <= agent.per_tx_limit_usdc
        ? `${input.amountUsdc} <= ${agent.per_tx_limit_usdc} limit`
        : `${input.amountUsdc} exceeds per-tx limit of ${agent.per_tx_limit_usdc}`,
    };

    checks.daily_limit = {
      passed: spentToday + input.amountUsdc <= agent.daily_limit_usdc,
      detail: spentToday + input.amountUsdc <= agent.daily_limit_usdc
        ? `${spentToday + input.amountUsdc} <= ${agent.daily_limit_usdc} daily limit`
        : `Today's spending (${spentToday} + ${input.amountUsdc}) exceeds daily limit of ${agent.daily_limit_usdc}`,
    };

    if (agent.allowed_recipients.length > 0) {
      const recipientAllowed = agent.allowed_recipients.includes(input.toWallet);
      checks.allowed_recipient = {
        passed: recipientAllowed,
        detail: recipientAllowed
          ? "Recipient is in allowed list"
          : `${input.toWallet} is not in the allowed recipients list`,
      };
    }

    checks.sufficient_balance = {
      passed: onChainUsdc >= input.amountUsdc,
      detail: onChainUsdc >= input.amountUsdc
        ? `On-chain balance: ${onChainUsdc}`
        : `Insufficient on-chain balance: ${onChainUsdc} available, need ${input.amountUsdc}`,
    };

    const passed = Object.values(checks).every((c) => c.passed);
    return { passed, checks };
  }

  private loadKeypair(agent: AgentWalletRow): Keypair {
    const secretKey = decryptSecret({
      ciphertext: agent.encrypted_secret_key,
      iv: agent.encryption_iv,
      tag: agent.encryption_tag,
    });
    return Keypair.fromSecretKey(secretKey);
  }

  private async executeSplTransfer(
    from: Keypair,
    to: PublicKey,
    amountUsdc: number,
  ): Promise<string> {
    const fromAta = await getAssociatedTokenAddress(USDC_MINT, from.publicKey);
    const toAta = await getAssociatedTokenAddress(USDC_MINT, to);

    const tx = new Transaction();

    // Create recipient ATA if needed
    try {
      await getAccount(connection, toAta);
    } catch {
      tx.add(
        createAssociatedTokenAccountInstruction(from.publicKey, toAta, to, USDC_MINT),
      );
    }

    tx.add(
      createTransferInstruction(fromAta, toAta, from.publicKey, BigInt(amountUsdc), [], TOKEN_PROGRAM_ID),
    );

    const signature = await sendAndConfirmTransaction(connection, tx, [from], {
      commitment: "confirmed",
    });

    return signature;
  }

  private async updateSpending(agent: AgentWalletRow, amount: number): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const spentToday = agent.last_spend_date === today ? agent.spent_today_usdc + amount : amount;

    await supabase
      .from("agent_wallets")
      .update({
        total_spent_usdc: agent.total_spent_usdc + amount,
        spent_today_usdc: spentToday,
        last_spend_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.id);
  }

  private async updateStatus(
    id: string,
    ownerWallet: string,
    status: string,
  ): Promise<AgentWalletRow | null> {
    const { data, error } = await supabase
      .from("agent_wallets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_wallet", ownerWallet)
      .select("*")
      .single();

    if (error) return null;
    return data as AgentWalletRow;
  }
}
