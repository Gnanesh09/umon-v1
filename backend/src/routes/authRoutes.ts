import { Router } from "express";
import { createNonce, me, updateMe, verifySignature } from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { nonceSchema, verifySchema } from "../validators/authSchemas.js";

export const authRouter = Router();

authRouter.post("/nonce", validate(nonceSchema), createNonce);
authRouter.post("/verify", validate(verifySchema), verifySignature);
authRouter.get("/me", authenticate, me);
authRouter.put("/me", authenticate, updateMe);