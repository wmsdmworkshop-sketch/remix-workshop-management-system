/**
 * =============================================================================
 * DWIP Enterprise AI Platform — API Endpoints
 * Module: platforms/enterprise-ai/ai-api.ts
 * =============================================================================
 */

import { Router } from "express";
import { EnterpriseAIEngine } from "./ai-engine";
import { MetricRegistry, bootstrapMetrics } from "../analytics/metric-registry";
import { KPICatalog, bootstrapKPIs } from "../analytics/kpi-catalog";

export function createAIRouter(getCachedDB: () => any): Router {
  const router = Router();

  const metricRegistry = new MetricRegistry();
  const kpiCatalog = new KPICatalog();

  bootstrapMetrics(metricRegistry);
  bootstrapKPIs(kpiCatalog);

  const engine = new EnterpriseAIEngine(metricRegistry, kpiCatalog, getCachedDB);

  // POST Generate Prediction
  router.post("/predict", (req, res) => {
    try {
      const result = engine.generatePrediction(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET Model Metadata
  router.get("/models", (req, res) => {
    res.json(engine.getModels());
  });

  // GET Prompt Templates
  router.get("/prompts", (req, res) => {
    res.json(engine.getPrompts());
  });

  // GET Audit Logs
  router.get("/audit", (req, res) => {
    res.json(engine.getAuditLogs());
  });

  return router;
}
