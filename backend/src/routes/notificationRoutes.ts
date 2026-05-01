import { Router } from "express";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../controllers/notificationController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { notificationIdSchema } from "../validators/notificationSchemas.js";

export const notificationRouter = Router();

notificationRouter.get("/", authenticate, listNotifications);
notificationRouter.put("/:id/read", authenticate, validate(notificationIdSchema), markNotificationRead);
notificationRouter.put("/read-all", authenticate, markAllNotificationsRead);