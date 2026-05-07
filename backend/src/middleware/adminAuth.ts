import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const code = req.headers["x-admin-code"] as string | undefined;
  if (!code || code !== env.ADMIN_CODE) {
    res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Invalid admin code" } });
    return;
  }
  next();
}
