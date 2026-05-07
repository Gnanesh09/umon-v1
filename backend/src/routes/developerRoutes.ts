import { Router } from "express";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  createWebhook,
  listWebhooks,
  deleteWebhook,
} from "../controllers/developerController.js";
import { authenticate } from "../middleware/authenticate.js";

export const developerRouter = Router();

// API Keys
developerRouter.post("/api-keys", authenticate, createApiKey);
developerRouter.get("/api-keys", authenticate, listApiKeys);
developerRouter.put("/api-keys/:id/revoke", authenticate, revokeApiKey);

// Webhooks
developerRouter.post("/webhooks", authenticate, createWebhook);
developerRouter.get("/webhooks", authenticate, listWebhooks);
developerRouter.delete("/webhooks/:id", authenticate, deleteWebhook);
