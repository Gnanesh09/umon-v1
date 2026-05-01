-- Fees table: tracks every fee collected by the platform
CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID REFERENCES vaults(id) ON DELETE SET NULL,
  payer_wallet TEXT NOT NULL,
  amount_usdc BIGINT NOT NULL,
  fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.50,
  vault_amount_usdc BIGINT NOT NULL,
  tx_signature TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fees_payer ON fees(payer_wallet);
CREATE INDEX IF NOT EXISTS idx_fees_vault ON fees(vault_id);
CREATE INDEX IF NOT EXISTS idx_fees_created ON fees(created_at DESC);

-- Receipts table: stores receipt data for every transaction
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID REFERENCES vaults(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL,
  tx_signature TEXT NOT NULL,
  receipt_type TEXT NOT NULL CHECK (receipt_type IN ('vault_created', 'funds_released', 'milestone_approved', 'split_executed', 'vault_cancelled', 'dispute_raised')),
  amount_usdc BIGINT,
  fee_usdc BIGINT DEFAULT 0,
  recipient_wallet TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_wallet ON receipts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_receipts_vault ON receipts(vault_id);
CREATE INDEX IF NOT EXISTS idx_receipts_tx ON receipts(tx_signature);

-- Add email column to users if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email') THEN
    ALTER TABLE users ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_notifications') THEN
    ALTER TABLE users ADD COLUMN email_notifications BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Policies: service role can do everything, users can read their own
CREATE POLICY "Service role full access on fees" ON fees FOR ALL USING (true);
CREATE POLICY "Service role full access on receipts" ON receipts FOR ALL USING (true);
