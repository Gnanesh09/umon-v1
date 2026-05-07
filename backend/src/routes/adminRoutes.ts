import { Router } from "express";
import { getAdminStats, listUsers, updateUserRole, listAllFees, getRecentActivity, getAdminNotifications, markAdminNotificationRead } from "../controllers/adminController.js";
import { adminAuth } from "../middleware/adminAuth.js";

export const adminRouter = Router();

adminRouter.use(adminAuth);

adminRouter.get("/stats", getAdminStats);
adminRouter.get("/users", listUsers);
adminRouter.put("/users/:id/role", updateUserRole);
adminRouter.get("/fees", listAllFees);
adminRouter.get("/activity", getRecentActivity);
adminRouter.get("/notifications", getAdminNotifications);
adminRouter.put("/notifications/:id/read", markAdminNotificationRead);
