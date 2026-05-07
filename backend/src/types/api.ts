import type { Request } from "express";

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    cursor?: string;
    hasMore?: boolean;
  };
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type UserRole = "user" | "merchant" | "admin";

export type AuthUser = {
  walletAddress: string;
  role?: UserRole;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};
