import { describe, it, expect, beforeEach } from "vitest";
import { MetricRegistry, bootstrapMetrics } from "../platforms/analytics/metric-registry";
import { DimensionRegistry, bootstrapDimensions } from "../platforms/analytics/dimension-registry";
import { KPICatalog, bootstrapKPIs } from "../platforms/analytics/kpi-catalog";
import { FactRegistry, bootstrapFacts } from "../platforms/analytics/fact-registry";
import { AnalyticsEngine } from "../platforms/analytics/analytics-engine";

describe("Enterprise Analytics Platform Tests", () => {
  let metricRegistry: MetricRegistry;
  let dimensionRegistry: DimensionRegistry;
  let kpiCatalog: KPICatalog;
  let factRegistry: FactRegistry;
  let engine: AnalyticsEngine;

  const mockDB = {
    jobCards: [
      { job_id: 1, actual_time_taken: 150, customer_mobile: "+919876543210", created_at: "2026-07-01T09:00:00Z" },
      { job_id: 2, actual_time_taken: 200, customer_mobile: "+919876543211", created_at: "2026-07-02T10:00:00Z" }
    ],
    reworkLogs: []
  };

  beforeEach(() => {
    metricRegistry = new MetricRegistry();
    dimensionRegistry = new DimensionRegistry();
    kpiCatalog = new KPICatalog();
    factRegistry = new FactRegistry();

    bootstrapMetrics(metricRegistry);
    bootstrapDimensions(dimensionRegistry);
    bootstrapKPIs(kpiCatalog);
    bootstrapFacts(factRegistry);

    engine = new AnalyticsEngine(metricRegistry, dimensionRegistry, kpiCatalog, () => mockDB);
  });

  it("should list registered metrics, dimensions, and facts", () => {
    expect(metricRegistry.list().length).toBeGreaterThan(0);
    expect(dimensionRegistry.list().length).toBeGreaterThan(0);
    expect(factRegistry.list().length).toBeGreaterThan(0);
  });

  it("should compute average turnaround time correctly", () => {
    const result = engine.aggregate({
      requestId: "TEST-1",
      metricKey: "avg_turnaround_time",
      dimensions: [],
      filters: [],
      periodStart: "2026-07-01T00:00:00Z",
      periodEnd: "2026-07-03T00:00:00Z",
      granularity: "DAILY",
      aggregation: "AVG"
    });

    expect(result.summary.average).toBe(175); // (150 + 200) / 2
  });

  it("should forecast future values based on historical averages", () => {
    const dataPoints = [
      { metricKey: "avg_turnaround_time", value: 150, dimensions: [], periodStart: "1", periodEnd: "2", granularity: "DAILY" as const, computedAt: "now" },
      { metricKey: "avg_turnaround_time", value: 180, dimensions: [], periodStart: "2", periodEnd: "3", granularity: "DAILY" as const, computedAt: "now" },
      { metricKey: "avg_turnaround_time", value: 210, dimensions: [], periodStart: "3", periodEnd: "4", granularity: "DAILY" as const, computedAt: "now" }
    ];

    const result = engine.forecast({
      metricKey: "avg_turnaround_time",
      historicalDataPoints: dataPoints,
      forecastPeriods: 5,
      granularity: "DAILY",
      method: "MOVING_AVERAGE"
    });

    expect(result.forecastDataPoints.length).toBe(5);
    expect(result.forecastDataPoints[0].forecastedValue).toBeCloseTo(180);
  });
});
