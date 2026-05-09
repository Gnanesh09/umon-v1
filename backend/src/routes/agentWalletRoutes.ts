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
  agentPayByToken,
  agentBalanceByToken,
  agentTransactionsByToken,
} from "../controllers/agentWalletController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  createAgentWalletSchema,
  agentWalletIdSchema,
  updateAgentLimitsSchema,
  agentPaySchema,
  agentPayByTokenSchema,
} from "../validators/agentWalletSchemas.js";

export const agentWalletRouter = Router();

// ─── Agent-token-authenticated (MCP server / SDK) ───────────────────
// Must come before /:id routes to avoid "agent" being matched as a UUID
agentWalletRouter.post("/agent/pay", validate(agentPayByTokenSchema), agentPayByToken);
agentWalletRouter.get("/agent/balance", agentBalanceByToken);
agentWalletRouter.get("/agent/transactions", agentTransactionsByToken);

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
