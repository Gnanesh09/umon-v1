-- Payment Gateway Tables
-- Payment links, sessions, invoices, refunds, API keys, webhooks

-- ============================================
-- PAYMENT LINKS
-- ============================================
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT UNIQUE NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('merchant', 'user')),
  owner_wallet TEXT NOT NULL,
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  recipient_wallet TEXT NOT NULL,
  amount_usdc BIGINT,
  currency TEXT NOT NULL DEFAULT 'USDC',
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pl_short_code ON payment_links(short_code);
CREATE INDEX IF NOT EXISTS idx_pl_owner ON payment_links(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_pl_merchant ON payment_links(merchant_id);

-- ============================================
-- PAYMENT SESSIONS (5-minute expiry checkout)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_link_id UUID REFERENCES payment_links(id) ON DELETE SET NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  payer_wallet TEXT,
  recipient_wallet TEXT NOT NULL,
  amount_usdc BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','paying','confirming','completed','expired','failed','refunded')),
  tx_signature TEXT,
  vault_id UUID REFERENCES vaults(id) ON DELETE SET NULL,
  refund_tx_signature TEXT,
  error_message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ps_status ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ps_expires ON payment_sessions(expires_at) WHERE status IN ('created','paying','confirming');
CREATE INDEX IF NOT EXISTS idx_ps_payer ON payment_sessions(payer_wallet);
CREATE INDEX IF NOT EXISTS idx_ps_link ON payment_sessions(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_ps_tx ON payment_sessions(tx_signature);

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_number_seq (
  id SERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  merchant_wallet TEXT NOT NULL,
  customer_wallet TEXT,
  customer_email TEXT,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','paid','overdue','cancelled','partially_paid')),
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal_usdc BIGINT NOT NULL DEFAULT 0,
  tax_usdc BIGINT DEFAULT 0,
  total_usdc BIGINT NOT NULL DEFAULT 0,
  amount_paid_usdc BIGINT DEFAULT 0,
  notes TEXT,
  due_date TIMESTAMPTZ,
  payment_link_id UUID REFERENCES payment_links(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_merchant ON invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_inv_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_inv_number ON invoices(invoice_number);

ALTER TABLE invoice_number_seq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on invoice_number_seq" ON invoice_number_seq FOR ALL USING (true);

-- ============================================
-- REFUNDS
-- ============================================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_session_id UUID REFERENCES payment_sessions(id),
  vault_id UUID REFERENCES vaults(id) ON DELETE SET NULL,
  initiator_type TEXT NOT NULL CHECK (initiator_type IN ('merchant','system','admin')),
  initiator_wallet TEXT,
  recipient_wallet TEXT NOT NULL,
  amount_usdc BIGINT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),
  tx_signature TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ref_session ON refunds(payment_session_id);
CREATE INDEX IF NOT EXISTS idx_ref_status ON refunds(status);

-- ============================================
-- API KEYS (Developer)
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Default',
  permissions JSONB DEFAULT '["payments.read","payments.write"]',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ak_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_ak_merchant ON api_keys(merchant_id);

-- ============================================
-- WEBHOOKS
-- ============================================
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wh_merchant ON webhooks(merchant_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wd_webhook ON webhook_deliveries(webhook_id);

-- ============================================
-- RECURRING PAYMENTS (schema only, future)
-- ============================================
CREATE TABLE IF NOT EXISTS recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_link_id UUID REFERENCES payment_links(id),
  payer_wallet TEXT NOT NULL,
  recipient_wallet TEXT NOT NULL,
  amount_usdc BIGINT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','biweekly','monthly','quarterly','yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  next_payment_at TIMESTAMPTZ,
  last_payment_at TIMESTAMPTZ,
  total_paid_usdc BIGINT DEFAULT 0,
  payment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- UPDATE EXISTING CONSTRAINTS
-- ============================================
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_tx_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_tx_type_check
  CHECK (tx_type IN (
    'create','release','split','oracle_trigger','milestone_approve',
    'dispute_raise','dispute_vote','cancel','category_claim',
    'payment','refund','payment_failed'
  ));

-- RLS
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on payment_links" ON payment_links FOR ALL USING (true);

ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on payment_sessions" ON payment_sessions FOR ALL USING (true);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on invoices" ON invoices FOR ALL USING (true);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on refunds" ON refunds FOR ALL USING (true);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on api_keys" ON api_keys FOR ALL USING (true);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on webhooks" ON webhooks FOR ALL USING (true);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on webhook_deliveries" ON webhook_deliveries FOR ALL USING (true);

ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on recurring_payments" ON recurring_payments FOR ALL USING (true);
