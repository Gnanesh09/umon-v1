import { Router } from "express";
import {
  approveMilestone,
  cancelVault,
  createVault,
  getVault,
  getVaultTransactions,
  listVaults,
  raiseDispute,
  recordAction,
} from "../controllers/vaultController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { actionSchema, createVaultSchema, listVaultsSchema, vaultIdSchema } from "../validators/vaultSchemas.js";

export const vaultRouter = Router();

vaultRouter.get("/", validate(listVaultsSchema), listVaults);
vaultRouter.post("/", validate(createVaultSchema), createVault);
vaultRouter.get("/:id", validate(vaultIdSchema), getVault);
vaultRouter.get("/:id/transactions", validate(vaultIdSchema), getVaultTransactions);
vaultRouter.post("/:id/cancel", authenticate, validate(actionSchema), cancelVault);
vaultRouter.post("/:id/approve-milestone", authenticate, validate(actionSchema), approveMilestone);
vaultRouter.post("/:id/raise-dispute", authenticate, validate(actionSchema), raiseDispute);
vaultRouter.post("/:id/record-action", validate(vaultIdSchema), recordAction);