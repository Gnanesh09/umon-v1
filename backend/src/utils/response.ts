import type { Response } from "express";
import type { ApiSuccess } from "../types/api.js";

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  data: T,
  meta?: ApiSuccess<T>["meta"],
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  } satisfies ApiSuccess<T>);
}