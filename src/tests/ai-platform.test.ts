import { describe, it, expect, beforeEach } from "vitest";
import { EnterpriseAIEngine } from "../platforms/enterprise-ai/ai-engine";
import { MetricRegistry, bootstrapMetrics } from "../platforms/analytics/metric-registry";
import { KPICatalog, bootstrapKPIs } from "../platforms/analytics/kpi-catalog";

describe("Enterprise AI Platform Tests", () => {
  let metricRegistry: MetricRegistry;
  let kpiCatalog: KPICatalog;
  let aiEngine: EnterpriseAIEngine;

  const mockDB = {
    jobCards: [
      { job_id: 1, actual_time_taken: 150, customer_mobile: "+919876543210", estimated_amount: 5000, created_at: "2026-07-01T09:00:00Z", status: "WIP" }
    ],
    reworkLogs: []
  };

  beforeEach(() => {
    metricRegistry = new MetricRegistry();
    kpiCatalog = new KPICatalog();

    bootstrapMetrics(metricRegistry);
    bootstrapKPIs(kpiCatalog);

    aiEngine = new EnterpriseAIEngine(metricRegistry, kpiCatalog, () => mockDB);
  });

  it("should list registered AI models and prompt templates", () => {
    expect(aiEngine.getModels().length).toBeGreaterThan(0);
    expect(aiEngine.getPrompts().length).toBeGreaterThan(0);
  });

  it("should generate revenue predictions and forecast metrics", () => {
    const result = aiEngine.generatePrediction({
      useCase: "revenue_prediction",
      entityId: "SYSTEM"
    });

    expect(result.prediction).toBeGreaterThan(0);
    expect(result.confidenceScore).toBe(91.5);
    expect(result.riskLevel).toBe("LOW");
    expect(result.explainability.explanation).toContain("Revenue forecast calculated");
  });

  it("should predict job card delay risk levels", () => {
    const result = aiEngine.generatePrediction({
      useCase: "job_delay_prediction",
      entityId: "JC001"
    });

    expect(result.prediction).toBe("ON_SCHEDULE");
    expect(result.riskLevel).toBe("LOW");
  });
});
