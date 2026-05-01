CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT,
  total_vaults_created INTEGER DEFAULT 0,
  total_volume_usdc BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

CREATE TABLE IF NOT EXISTS vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  on_chain_id TEXT UNIQUE NOT NULL,
  creator_wallet TEXT NOT NULL,
  recipient_wallet TEXT NOT NULL,
  amount_usdc BIGINT NOT NULL,
  released_amount_usdc BIGINT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','partially_released','released','disputed','cancelled')),
  description TEXT,
  conditions JSONB NOT NULL,
  tx_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vaults_creator ON vaults(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_vaults_recipient ON vaults(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_vaults_status ON vaults(status);
CREATE INDEX IF NOT EXISTS idx_vaults_created_at ON vaults(created_at DESC);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID REFERENCES vaults(id),
  tx_signature TEXT UNIQUE NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('create','release','split','oracle_trigger','milestone_approve','dispute_raise','dispute_vote','cancel')),
  amount_usdc BIGINT,
  from_wallet TEXT,
  to_wallet TEXT,
  condition_type TEXT,
  metadata JSONB,
  block_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_vault ON transactions(vault_id);

CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  country TEXT,
  verified BOOLEAN DEFAULT false,
  on_chain_registered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants(category);

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID REFERENCES vaults(id),
  on_chain_dispute_id TEXT UNIQUE,
  plaintiff_wallet TEXT NOT NULL,
  defendant_wallet TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','voting','resolved_plaintiff','resolved_defendant','expired')),
  votes_for_plaintiff INTEGER DEFAULT 0,
  votes_for_defendant INTEGER DEFAULT 0,
  deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  vault_id UUID REFERENCES vaults(id),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_wallet ON notifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(wallet_address, read) WHERE read = false;

CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  total_vaults_created INTEGER DEFAULT 0,
  total_volume_usdc BIGINT DEFAULT 0,
  total_releases INTEGER DEFAULT 0,
  total_disputes INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  condition_type_breakdown JSONB
);