import { Router } from "express";
import {
  createAgentWallet,
  listAgentWallets,
  getAgentWallet,
  agentPay,
  freezeAgent,
  unfreezeAgent,
  revokeAgent,
  updateAgentLimits,
  regenerateAgentToken,
  getAgentTransactions,
  // Agent-token endpoints (MCP / SDK)
  agentPayByToken,
  agentBalanceByToken,
  agentTransactionsByToken,
  agentWalletInfoByToken,
  agentCreateVaultByToken,
  agentListVaultsByToken,
  agentGetVaultByToken,
  agentCreatePaymentLinkByToken,
  agentListPaymentLinksByToken,
  agentDeactivatePaymentLinkByToken,
  agentPayLinkByToken,
  agentBatchPayByToken,
  agentSchedulePaymentByToken,
  agentListScheduledByToken,
  agentCancelScheduledByToken,
  agentCreateInvoiceByToken,
  agentListInvoicesByToken,
  agentDiscoverMerchantsByToken,
  agentAnalyticsByToken,
} from "../controllers/agentWalletController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  createAgentWalletSchema,
  agentWalletIdSchema,
  updateAgentLimitsSchema,
  agentPaySchema,
  agentPayByTokenSchema,
  agentCreateVaultSchema,
  agentListVaultsSchema,
  agentVaultIdSchema,
  agentCreatePaymentLinkSchema,
  agentPayLinkSchema,
  agentBatchPaySchema,
  agentSchedulePaymentSchema,
  agentScheduledTxIdSchema,
  agentCreateInvoiceSchema,
  agentDiscoverMerchantsSchema,
  agentAnalyticsSchema,
} from "../validators/agentWalletSchemas.js";

export const agentWalletRouter = Router();

// ─── Agent-token-authenticated (MCP server / SDK) ───────────────────
// Must come before /:id routes to avoid "agent" being matched as a UUID

// Core
agentWalletRouter.get("/agent/info", agentWalletInfoByToken);
agentWalletRouter.get("/agent/balance", agentBalanceByToken);
agentWalletRouter.post("/agent/pay", validate(agentPayByTokenSchema), agentPayByToken);
agentWalletRouter.get("/agent/transactions", agentTransactionsByToken);

// Batch & scheduled payments
agentWalletRouter.post("/agent/batch-pay", validate(agentBatchPaySchema), agentBatchPayByToken);
agentWalletRouter.post("/agent/schedule", validate(agentSchedulePaymentSchema), agentSchedulePaymentByToken);
agentWalletRouter.get("/agent/scheduled", agentListScheduledByToken);
agentWalletRouter.delete("/agent/scheduled/:txId", validate(agentScheduledTxIdSchema), agentCancelScheduledByToken);

// Vaults (escrow)
agentWalletRouter.post("/agent/vaults", validate(agentCreateVaultSchema), agentCreateVaultByToken);
agentWalletRouter.get("/agent/vaults", validate(agentListVaultsSchema), agentListVaultsByToken);
agentWalletRouter.get("/agent/vaults/:id", validate(agentVaultIdSchema), agentGetVaultByToken);

// Payment links
agentWalletRouter.post("/agent/payment-links", validate(agentCreatePaymentLinkSchema), agentCreatePaymentLinkByToken);
agentWalletRouter.get("/agent/payment-links", agentListPaymentLinksByToken);
agentWalletRouter.delete("/agent/payment-links/:id", agentDeactivatePaymentLinkByToken);
agentWalletRouter.post("/agent/pay-link", validate(agentPayLinkSchema), agentPayLinkByToken);

// Invoices
agentWalletRouter.post("/agent/invoices", validate(agentCreateInvoiceSchema), agentCreateInvoiceByToken);
agentWalletRouter.get("/agent/invoices", agentListInvoicesByToken);

// Discovery & analytics
agentWalletRouter.get("/agent/discover-merchants", validate(agentDiscoverMerchantsSchema), agentDiscoverMerchantsByToken);
agentWalletRouter.get("/agent/analytics", validate(agentAnalyticsSchema), agentAnalyticsByToken);

// ─── Owner-authenticated (dashboard / merchant portal) ──────────────
agentWalletRouter.post("/", authenticate, validate(createAgentWalletSchema), createAgentWallet);
agentWalletRouter.get("/", authenticate, listAgentWallets);
agentWalletRouter.get("/:id", authenticate, validate(agentWalletIdSchema), getAgentWallet);
agentWalletRouter.put("/:id/limits", authenticate, validate(updateAgentLimitsSchema), updateAgentLimits);
agentWalletRouter.post("/:id/pay", authenticate, validate(agentPaySchema), agentPay);
agentWalletRouter.post("/:id/freeze", authenticate, validate(agentWalletIdSchema), freezeAgent);
agentWalletRouter.post("/:id/unfreeze", authenticate, validate(agentWalletIdSchema), unfreezeAgent);
agentWalletRouter.post("/:id/revoke", authenticate, validate(agentWalletIdSchema), revokeAgent);
agentWalletRouter.post("/:id/regenerate-token", authenticate, validate(agentWalletIdSchema), regenerateAgentToken);
agentWalletRouter.get("/:id/transactions", authenticate, validate(agentWalletIdSchema), getAgentTransactions);
