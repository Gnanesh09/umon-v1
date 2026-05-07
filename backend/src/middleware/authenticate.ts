import jwt from "jsonwebtoken";
import type { NextFunction, Response } from "express";
import { env } from "../config/env.js";
import { supabase } from "../lib/supabase.js";
import type { AuthenticatedRequest, AuthUser, UserRole } from "../types/api.js";

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header" },
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
  } catch {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Token is invalid or expired" },
    });
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const wallet = req.user?.walletAddress;
    if (!wallet) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
      return;
    }

    const { data } = await supabase.from("users").select("role").eq("wallet_address", wallet).single();
    const userRole = (data?.role as UserRole) ?? "user";
    req.user!.role = userRole;

    if (!roles.includes(userRole)) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
      return;
    }

    next();
  };
}
