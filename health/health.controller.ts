import { Request, Response } from "express";
import { pool as dbPool } from "../src/db/index.ts";

export async function getLiveness(req: Request, res: Response) {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
}

export async function getReadiness(req: Request, res: Response) {
  try {
    // Verify connection to MySQL
    await dbPool.execute("SELECT 1");
    res.status(200).json({ status: "READY", database: "CONNECTED", timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: "NOT_READY", database: "DISCONNECTED", error: err.message });
  }
}

export async function getMetrics(req: Request, res: Response) {
  const memoryUsage = process.memoryUsage();
  res.status(200).json({
    uptime: process.uptime(),
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external
    },
    timestamp: new Date().toISOString()
  });
}
