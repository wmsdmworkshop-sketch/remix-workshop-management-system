import { Request, Response, NextFunction } from "express";
import { Logger } from "../config/logger.ts";

export function errorMiddleware(err: any, req: any, res: Response, next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const correlationId = req.correlationId || "UNKNOWN";
  const reqId = req.id || "UNKNOWN";

  // Log error with correlation and request details
  Logger.error(message, {
    status,
    correlationId,
    requestId: reqId,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });

  res.status(status).json({
    success: false,
    error: message,
    traceId: corrIdOrId(correlationId, reqId),
    statusCode: status
  });
}

function corrIdOrId(corrId: string, reqId: string) {
  return corrId !== "UNKNOWN" ? corrId : reqId;
}
