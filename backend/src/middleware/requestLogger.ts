import type { NextFunction, Request, Response } from "express";
import pinoHttp from "pino-http";
import { logger } from "../lib/logger.js";

const httpLogger = (pinoHttp as unknown as (opts: { logger: typeof logger }) => (req: Request, res: Response) => void)({ logger });

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  httpLogger(req, res);
  next();
}
