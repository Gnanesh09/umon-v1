import type { Request, Response } from "express";
import { AppError } from "../utils/errors.js";
import { QRCodeService } from "../services/QRCodeService.js";

const qrService = new QRCodeService();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * GET /api/qr/:shortCode
 * Public - generates a QR code for a payment link.
 * Query param `format` can be "svg" (default) or "png".
 */
export async function generateQR(req: Request, res: Response): Promise<Response | void> {
  const { shortCode } = req.params;
  const format = (req.query.format as string) ?? "svg";
  const paymentUrl = `${FRONTEND_URL}/pay/${shortCode}`;

  if (format === "png") {
    const buffer = await qrService.generatePng(paymentUrl);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
    return;
  }

  // Default to SVG
  const svg = await qrService.generateSvg(paymentUrl);
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(svg);
}
