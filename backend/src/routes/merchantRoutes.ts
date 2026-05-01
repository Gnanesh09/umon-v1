import { Router } from "express";
import { createMerchant, listMerchants, verifyMerchant } from "../controllers/merchantController.js";
import { validate } from "../middleware/validate.js";
import { createMerchantSchema, listMerchantsSchema, merchantIdSchema } from "../validators/merchantSchemas.js";

export const merchantRouter = Router();

merchantRouter.get("/", validate(listMerchantsSchema), listMerchants);
merchantRouter.post("/", validate(createMerchantSchema), createMerchant);
merchantRouter.put("/:id/verify", validate(merchantIdSchema), verifyMerchant);