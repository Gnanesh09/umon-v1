-- Add business_wallet column to merchants table
-- Each business has its own unique payment wallet address
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='merchants' AND column_name='business_wallet') THEN
    ALTER TABLE merchants ADD COLUMN business_wallet TEXT;
    -- Copy existing wallet_address to business_wallet for existing rows
    UPDATE merchants SET business_wallet = wallet_address WHERE business_wallet IS NULL;
    -- Make it NOT NULL after backfill
    ALTER TABLE merchants ALTER COLUMN business_wallet SET NOT NULL;
  END IF;
END $$;

-- Ensure no two active businesses share the same payment wallet
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_business_wallet_active
  ON merchants(business_wallet) WHERE status IN ('pending', 'approved');
