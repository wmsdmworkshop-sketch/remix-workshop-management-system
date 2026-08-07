import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export interface ObservedRequest extends Request {
  id?: string;
  correlationId?: string;
}

export function requestIdMiddleware(req: any, res: Response, next: NextFunction) {
  const reqId = crypto.randomUUID();
  const corrId = (req.headers["x-correlation-id"] as string) || crypto.randomUUID();

  req.id = reqId;
  req.correlationId = corrId;

  res.setHeader("X-Request-ID", reqId);
  res.setHeader("X-Correlation-ID", corrId);

  next();
}
