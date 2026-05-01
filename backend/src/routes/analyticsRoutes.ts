import { Router } from "express";
import { analyticsDaily, analyticsOverview, analyticsUser } from "../controllers/analyticsController.js";
import { validate } from "../middleware/validate.js";
import { walletParamSchema } from "../validators/analyticsSchemas.js";

export const analyticsRouter = Router();

analyticsRouter.get("/overview", analyticsOverview);
analyticsRouter.get("/daily", analyticsDaily);
analyticsRouter.get("/user/:wallet", validate(walletParamSchema), analyticsUser);