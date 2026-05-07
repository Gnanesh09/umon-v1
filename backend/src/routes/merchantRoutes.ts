import { Router } from "express";
import {
  listMerchants,
  getMerchant,
  getMyMerchant,
  getMyMerchants,
  registerMerchant,
  approveMerchant,
  rejectMerchant,
  suspendMerchant,
  updateMerchant,
} from "../controllers/merchantController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { adminAuth } from "../middleware/adminAuth.js";
import {
  listMerchantsSchema,
  registerMerchantSchema,
  merchantIdSchema,
  rejectMerchantSchema,
  updateMerchantSchema,
} from "../validators/merchantSchemas.js";

export const merchantRouter = Router();

// Public
merchantRouter.get("/", validate(listMerchantsSchema), listMerchants);

// Authenticated user
merchantRouter.get("/me/current", authenticate, getMyMerchant);
merchantRouter.get("/me/all", authenticate, getMyMerchants);
merchantRouter.post("/register", authenticate, validate(registerMerchantSchema), registerMerchant);
merchantRouter.put("/:id", authenticate, validate(updateMerchantSchema), updateMerchant);

// Admin (code-based auth)
merchantRouter.put("/:id/approve", adminAuth, validate(merchantIdSchema), approveMerchant);
merchantRouter.put("/:id/reject", adminAuth, validate(rejectMerchantSchema), rejectMerchant);
merchantRouter.put("/:id/suspend", adminAuth, validate(rejectMerchantSchema), suspendMerchant);

// Public (must be after specific routes)
merchantRouter.get("/:id", validate(merchantIdSchema), getMerchant);
