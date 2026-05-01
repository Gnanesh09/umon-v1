import jwt from "jsonwebtoken";
import type { NextFunction, Response } from "express";
import { env } from "../config/env.js";
import type { AuthenticatedRequest, AuthUser } from "../types/api.js";

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
    return;
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    const walletAddress = decoded.sub;
    if (typeof walletAddress !== "string") {
      throw new Error("Invalid token subject");
    }
    req.user = { walletAddress } satisfies AuthUser;
    next();
  } catch (_error) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Token is invalid or expired",
      },
    });
  }
}