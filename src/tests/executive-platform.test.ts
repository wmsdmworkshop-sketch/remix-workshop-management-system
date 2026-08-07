import { describe, it, expect, beforeEach } from "vitest";
import { ExecutiveService } from "../platforms/executive/executive-service";
import { MetricRegistry, bootstrapMetrics } from "../platforms/analytics/metric-registry";
import { DimensionRegistry, bootstrapDimensions } from "../platforms/analytics/dimension-registry";
import { KPICatalog, bootstrapKPIs } from "../platforms/analytics/kpi-catalog";
import { AnalyticsEngine } from "../platforms/analytics/analytics-engine";
import { CRMService } from "../platforms/customer-experience/crm-service";
import { EnterpriseAIEngine } from "../platforms/enterprise-ai/ai-engine";

describe("Executive Command Center Tests", () => {
  let metricRegistry: MetricRegistry;
  let dimensionRegistry: DimensionRegistry;
  let kpiCatalog: KPICatalog;
  let analyticsEngine: AnalyticsEngine;
  let crmService: CRMService;
  let aiEngine: EnterpriseAIEngine;
  let executiveService: ExecutiveService;

  const mockDB = {
    jobCards: [
      { job_id: 1, actual_time_taken: 150, customer_mobile: "+919876543210", estimated_amount: 5000, created_at: "2026-07-01T09:00:00Z", status: "WIP" }
    ],
    reworkLogs: []
  };

  beforeEach(() => {
    metricRegistry = new MetricRegistry();
    dimensionRegistry = new DimensionRegistry();
    kpiCatalog = new KPICatalog();

    bootstrapMetrics(metricRegistry);
    bootstrapDimensions(dimensionRegistry);
    bootstrapKPIs(kpiCatalog);

    analyticsEngine = new AnalyticsEngine(metricRegistry, dimensionRegistry, kpiCatalog, () => mockDB);
    crmService = new CRMService(() => mockDB, (data) => {});
    aiEngine = new EnterpriseAIEngine(metricRegistry, kpiCatalog, () => mockDB);

    executiveService = new ExecutiveService(analyticsEngine, crmService, aiEngine);
  });

  it("should generate dynamic CEO dashboard view containing aggregated KPI card and AI insights data", () => {
    const payload = executiveService.getRoleDashboardView("CEO");
    expect(payload).toBeDefined();
    expect(payload.role).toBe("CEO");
    expect(payload.dashboard.title).toBe("Executive Director Overview");
    expect(payload.widgetData.tat_card).toBeDefined();
    expect(payload.widgetData.ai_revenue).toBeDefined();
    expect(payload.alerts.length).toBeGreaterThan(0);
  });

  it("should fallback gracefully to DEFAULT dashboard view for unrecognized executive roles", () => {
    const payload = executiveService.getRoleDashboardView("HR_MANAGER");
    expect(payload.dashboard.dashboardId).toBe("DEFAULT_DASH");
    expect(payload.widgetData.standard_card).toBeDefined();
  });
});
