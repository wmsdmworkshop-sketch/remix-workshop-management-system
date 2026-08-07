import { Router } from "express";
import { getLiveness, getReadiness, getMetrics } from "../health/health.controller.ts";

const router = Router();
router.get("/health", getLiveness);
router.get("/ready", getReadiness);
router.get("/metrics", getMetrics);

export default router;
