import { Router } from "express";
import { adminRouter } from "./adminRoutes.js";
import { analyticsRouter } from "./analyticsRoutes.js";
import { authRouter } from "./authRoutes.js";
import { feeRouter } from "./feeRoutes.js";
import { merchantRouter } from "./merchantRoutes.js";
import { notificationRouter } from "./notificationRoutes.js";
import { transactionRouter } from "./transactionRoutes.js";
import { vaultRouter } from "./vaultRoutes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/vaults", vaultRouter);
apiRouter.use("/merchants", merchantRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/transactions", transactionRouter);
apiRouter.use("/fees", feeRouter);
apiRouter.use("/admin", adminRouter);