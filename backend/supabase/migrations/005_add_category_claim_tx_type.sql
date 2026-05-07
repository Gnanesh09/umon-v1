-- Allow category_claim as a valid transaction type
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_tx_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_tx_type_check
  CHECK (tx_type IN ('create','release','split','oracle_trigger','milestone_approve','dispute_raise','dispute_vote','cancel','category_claim'));
