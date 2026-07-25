import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  field?: string;
}

export function createError(message: string, statusCode = 400, code?: string, field?: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  if (field) err.field = field;
  return err;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err.statusCode ?? 500;

  if (status >= 500) {
    logger.error({ err, method: req.method, url: req.url }, "Unhandled error");
  } else {
    logger.warn({ message: err.message, method: req.method, url: req.url }, "Client error");
  }

  res.status(status).json({
    error: err.message || "Internal server error",
    ...(err.code ? { code: err.code } : {}),
    ...(err.field ? { field: err.field, message: err.message } : {}),
  });
}
