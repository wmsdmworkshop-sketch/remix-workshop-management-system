/**
 * =============================================================================
 * DWIP Enterprise Analytics — Analytics API Routes
 * Module: platforms/analytics/analytics-api.ts
 * =============================================================================
 */

import { Router } from "express";
import { MetricRegistry, bootstrapMetrics } from "./metric-registry";
import { DimensionRegistry, bootstrapDimensions } from "./dimension-registry";
import { KPICatalog, bootstrapKPIs } from "./kpi-catalog";
import { AnalyticsEngine } from "./analytics-engine";

export function createAnalyticsRouter(getCachedDB: () => any): Router {
  const router = Router();

  const metricRegistry = new MetricRegistry();
  const dimensionRegistry = new DimensionRegistry();
  const kpiCatalog = new KPICatalog();

  bootstrapMetrics(metricRegistry);
  bootstrapDimensions(dimensionRegistry);
  bootstrapKPIs(kpiCatalog);

  const engine = new AnalyticsEngine(metricRegistry, dimensionRegistry, kpiCatalog, getCachedDB);

  // GET Metrics Registry
  router.get("/metrics", (req, res) => {
    res.json(metricRegistry.list());
  });

  // GET Dimension Registry
  router.get("/dimensions", (req, res) => {
    res.json(dimensionRegistry.list());
  });

  // GET KPI Catalog
  router.get("/kpi", (req, res) => {
    res.json(kpiCatalog.list());
  });

  // POST Aggregate Metric
  router.post("/aggregate", (req, res) => {
    try {
      const result = engine.aggregate(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST Analyze Trend
  router.post("/trend", (req, res) => {
    try {
      const { metricKey, periodStart, periodEnd, comparisonStart, comparisonEnd } = req.body;
      const result = engine.analyzeTrend(metricKey, periodStart, periodEnd, comparisonStart, comparisonEnd);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST Forecast
  router.post("/forecast", (req, res) => {
    try {
      const result = engine.forecast(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
