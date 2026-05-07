import { Router } from "express";
import { generateQR } from "../controllers/qrController.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

const qrSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    format: z.enum(["svg", "png"]).optional(),
  }),
  params: z.object({ shortCode: z.string().min(1).max(20) }),
});

export const qrRouter = Router();

// Public - generate QR code for a payment link
qrRouter.get("/:shortCode", validate(qrSchema), generateQR);
