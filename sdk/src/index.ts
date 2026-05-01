import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

export type ComparisonOperator = "lt" | "gt" | "eq" | "lte" | "gte";

export interface AnchorWalletLike {
  publicKey: PublicKey;
  signTransaction: <T>(tx: T) => Promise<T>;
  signAllTransactions: <T>(txs: T[]) => Promise<T[]>;
}

export type Condition =
  | { type: "time_lock"; releaseTime: Date; percentage: number }
  | { type: "milestone"; description: string; approvers: PublicKey[]; percentage: number }
  | { type: "auto_split"; splits: Array<{ wallet: PublicKey; percentage: number }> }
  | { type: "oracle"; feed: PublicKey; operator: ComparisonOperator; threshold: number; percentage: number }
  | { type: "category"; category: string; merchantRegistry: PublicKey; percentage: number };

export type VaultEvent = {
  type: "VaultCreated" | "FundsReleased" | "MilestoneApproved" | "OracleTriggered" | "SplitExecuted" | "DisputeRaised" | "DisputeResolved";
  payload: Record<string, unknown>;
};

export type VaultData = {
  address: PublicKey;
  creator: PublicKey;
  recipient: PublicKey;
  amount: bigint;
  releasedAmount: bigint;
  description: string;
};

type ConstructorConfig = {
  rpcUrl: string;
  programId: string;
  wallet: AnchorWalletLike;
  idl?: Idl;
};

export class PowerMoney {
  private readonly connection: Connection;
  private readonly provider: AnchorProvider;
  private readonly programId: PublicKey;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly program: Program<any> | null;

  constructor(config: ConstructorConfig) {
    this.connection = new Connection(config.rpcUrl, "confirmed");
    this.provider = new AnchorProvider(this.connection, config.wallet as never, { commitment: "confirmed" });
    this.programId = new PublicKey(config.programId);
    this.program = config.idl ? new Program(config.idl, this.provider) : null;
  }

  async createVault(params: {
    recipient: PublicKey;
    amountUsdc: number;
    description: string;
    conditions: Condition[];
  }): Promise<{ vaultAddress: PublicKey; txSignature: string }> {
    if (!this.program) {
      throw new Error("IDL is required for instruction builders");
    }

    const seed = crypto.getRandomValues(new Uint8Array(32));
    const [vaultAddress] = PublicKey.findProgramAddressSync([Buffer.from("vault"), Buffer.from(seed)], this.programId);

    // @ts-expect-error - Anchor method chain types are excessively deep
    const txSignature: string = await this.program.methods
      .createVault(Array.from(seed), params.amountUsdc, params.description, params.conditions as never)
      .accounts({
        creator: this.provider.wallet.publicKey,
        recipient: params.recipient,
        vault: vaultAddress,
      })
      .rpc();

    return { vaultAddress, txSignature };
  }

  async releaseTimeLock(vaultAddress: PublicKey, conditionIndex: number): Promise<string> {
    if (!this.program) throw new Error("IDL is required for instruction builders");
    return this.program.methods.releaseTimeLock(conditionIndex).accounts({ vault: vaultAddress }).rpc();
  }

  async approveMilestone(vaultAddress: PublicKey, conditionIndex: number): Promise<string> {
    if (!this.program) throw new Error("IDL is required for instruction builders");
    return this.program.methods.approveMilestone(conditionIndex).accounts({ vault: vaultAddress }).rpc();
  }

  async executeAutoSplit(vaultAddress: PublicKey, conditionIndex: number): Promise<string> {
    if (!this.program) throw new Error("IDL is required for instruction builders");
    return this.program.methods.executeSplit(conditionIndex).accounts({ vault: vaultAddress }).rpc();
  }

  async getVault(vaultAddress: PublicKey): Promise<VaultData> {
    if (!this.program) throw new Error("IDL is required for account reads");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const account = await (this.program.account as any).paymentVault.fetch(vaultAddress);

    return {
      address: vaultAddress,
      creator: account.creator as PublicKey,
      recipient: account.recipient as PublicKey,
      amount: BigInt((account.amount as { toString: () => string }).toString()),
      releasedAmount: BigInt((account.releasedAmount as { toString: () => string }).toString()),
      description: account.description as string,
    };
  }

  onVaultEvent(vaultAddress: PublicKey, callback: (event: VaultEvent) => void): () => void {
    if (!this.program) throw new Error("IDL is required for event subscriptions");

    const eventTypes: VaultEvent["type"][] = [
      "VaultCreated",
      "FundsReleased",
      "MilestoneApproved",
      "OracleTriggered",
      "SplitExecuted",
      "DisputeRaised",
      "DisputeResolved",
    ];

    const listenerIds: number[] = eventTypes.map((eventType) =>
      this.program!.addEventListener(eventType, (event: Record<string, unknown>) => {
        const maybeVault = event.vault as PublicKey | undefined;
        if (maybeVault && (maybeVault as PublicKey).equals(vaultAddress)) {
          callback({ type: eventType, payload: event });
        }
      }),
    );

    return () => {
      for (const id of listenerIds) {
        void this.program?.removeEventListener(id);
      }
    };
  }
}

export const Conditions = {
  timeLock: (releaseDate: Date, percentage: number): Condition => ({
    type: "time_lock",
    releaseTime: releaseDate,
    percentage,
  }),
  milestone: (description: string, approvers: PublicKey[], percentage: number): Condition => ({
    type: "milestone",
    description,
    approvers,
    percentage,
  }),
  autoSplit: (splits: { wallet: PublicKey; percentage: number }[]): Condition => ({
    type: "auto_split",
    splits,
  }),
  oracleTrigger: (feed: PublicKey, operator: ComparisonOperator, threshold: number, percentage: number): Condition => ({
    type: "oracle",
    feed,
    operator,
    threshold,
    percentage,
  }),
  categoryRestrict: (category: string, merchantRegistry: PublicKey, percentage: number): Condition => ({
    type: "category",
    category,
    merchantRegistry,
    percentage,
  }),
};
