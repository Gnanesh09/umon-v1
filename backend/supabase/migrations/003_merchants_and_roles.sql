-- Add role to users table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
    ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'merchant', 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='display_name') THEN
    ALTER TABLE users ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- Recreate merchants table with proper structure
DROP TABLE IF EXISTS merchants CASCADE;

CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  business_wallet TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT,
  category TEXT NOT NULL,
  description TEXT,
  country TEXT,
  city TEXT,
  website TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  on_chain_registered BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_merchants_wallet ON merchants(wallet_address);
CREATE UNIQUE INDEX idx_merchants_business_wallet_active ON merchants(business_wallet) WHERE status IN ('pending', 'approved');
CREATE INDEX idx_merchants_merchant_id ON merchants(merchant_id);
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchants_category ON merchants(category);
CREATE INDEX idx_merchants_business_name ON merchants(business_name);

-- Merchant ID sequence counter
CREATE TABLE IF NOT EXISTS merchant_id_seq (
  id SERIAL PRIMARY KEY,
  prefix TEXT NOT NULL DEFAULT 'UMN'
);

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on merchants" ON merchants FOR ALL USING (true);

ALTER TABLE merchant_id_seq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on merchant_id_seq" ON merchant_id_seq FOR ALL USING (true);
