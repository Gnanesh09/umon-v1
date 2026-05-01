export type VaultStatus = "active" | "partially_released" | "released" | "disputed" | "cancelled";

export type Condition =
  | { type: "time_lock"; releaseTime: string; percentage: number }
  | { type: "milestone"; description: string; approvers: string[]; percentage: number }
  | { type: "auto_split"; splits: Array<{ wallet: string; percentage: number }> }
  | { type: "oracle"; feed: string; operator: "lt" | "gt" | "eq" | "lte" | "gte"; threshold: number; percentage: number }
  | { type: "category"; merchantRegistry: string; categories: string[]; percentage: number };

export type Vault = {
  id: string;
  on_chain_id: string;
  creator_wallet: string;
  recipient_wallet: string;
  amount_usdc: number;
  released_amount_usdc: number;
  status: VaultStatus;
  description: string;
  conditions: Condition[];
  tx_signature?: string;
  created_at: string;
};