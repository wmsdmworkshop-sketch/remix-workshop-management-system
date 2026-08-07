/**
 * =============================================================================
 * DWIP Executive Command Center — API Routes
 * Module: platforms/executive/executive-api.ts
 * =============================================================================
 */

import { Router } from "express";
import { ExecutiveService } from "./executive-service";
import { MetricRegistry, bootstrapMetrics } from "../analytics/metric-registry";
import { DimensionRegistry, bootstrapDimensions } from "../analytics/dimension-registry";
import { KPICatalog, bootstrapKPIs } from "../analytics/kpi-catalog";
import { AnalyticsEngine } from "../analytics/analytics-engine";
import { CRMService } from "../customer-experience/crm-service";
import { EnterpriseAIEngine } from "../enterprise-ai/ai-engine";

export function createExecutiveRouter(
  getCachedDB: () => any,
  saveDBLocal: (data: any) => void
): Router {
  const router = Router();

  const metricRegistry = new MetricRegistry();
  const dimensionRegistry = new DimensionRegistry();
  const kpiCatalog = new KPICatalog();

  bootstrapMetrics(metricRegistry);
  bootstrapDimensions(dimensionRegistry);
  bootstrapKPIs(kpiCatalog);

  const analyticsEngine = new AnalyticsEngine(metricRegistry, dimensionRegistry, kpiCatalog, getCachedDB);
  const crmService = new CRMService(getCachedDB, saveDBLocal);
  const aiEngine = new EnterpriseAIEngine(metricRegistry, kpiCatalog, getCachedDB);

  const service = new ExecutiveService(analyticsEngine, crmService, aiEngine);

  // GET Presentation Dashboard View payload
  router.get("/dashboard/:role", (req, res) => {
    try {
      const payload = service.getRoleDashboardView(req.params.role);
      res.json(payload);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
