-- Agent Wallets: AI agents with server-side keypairs and spending guardrails
-- Enables autonomous on-chain transactions within programmable boundaries

-- ============================================
-- AGENT WALLETS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_wallet TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Solana keypair (public key plaintext, secret key AES-256-GCM encrypted)
  public_key TEXT UNIQUE NOT NULL,
  encrypted_secret_key TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  encryption_tag TEXT NOT NULL,

  -- Spending guardrails
  daily_limit_usdc BIGINT DEFAULT 50000000,       -- 50 USDC default
  per_tx_limit_usdc BIGINT DEFAULT 10000000,      -- 10 USDC default
  allowed_categories TEXT[] DEFAULT '{}',
  allowed_recipients TEXT[] DEFAULT '{}',          -- empty = allow all

  -- Accounting
  total_funded_usdc BIGINT DEFAULT 0,
  total_spent_usdc BIGINT DEFAULT 0,
  spent_today_usdc BIGINT DEFAULT 0,
  last_spend_date DATE,

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'frozen', 'revoked')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aw_owner ON agent_wallets(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_aw_pubkey ON agent_wallets(public_key);
CREATE INDEX IF NOT EXISTS idx_aw_status ON agent_wallets(status);

-- ============================================
-- AGENT TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_wallet_id UUID NOT NULL REFERENCES agent_wallets(id) ON DELETE CASCADE,

  tx_type TEXT NOT NULL
    CHECK (tx_type IN ('fund', 'pay', 'receive', 'refund')),
  amount_usdc BIGINT NOT NULL,
  to_wallet TEXT,
  from_wallet TEXT,
  memo TEXT,

  -- On-chain
  tx_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirming', 'completed', 'failed', 'rejected')),
  error_message TEXT,

  -- Guardrail validation result
  guardrail_check JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_at_wallet ON agent_transactions(agent_wallet_id);
CREATE INDEX IF NOT EXISTS idx_at_status ON agent_transactions(status);
CREATE INDEX IF NOT EXISTS idx_at_type ON agent_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_at_created ON agent_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_at_tx ON agent_transactions(tx_signature);

-- ============================================
-- AGENT API TOKENS (for MCP server auth)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_wallet_id UUID NOT NULL REFERENCES agent_wallets(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  token_prefix TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'default',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aat_hash ON agent_api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_aat_wallet ON agent_api_tokens(agent_wallet_id);

-- RLS
ALTER TABLE agent_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on agent_wallets" ON agent_wallets FOR ALL USING (true);

ALTER TABLE agent_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on agent_transactions" ON agent_transactions FOR ALL USING (true);

ALTER TABLE agent_api_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on agent_api_tokens" ON agent_api_tokens FOR ALL USING (true);
