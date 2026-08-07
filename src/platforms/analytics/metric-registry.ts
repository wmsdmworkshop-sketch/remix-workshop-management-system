/**
 * =============================================================================
 * DWIP Enterprise Analytics — Metric Registry
 * Module: platforms/analytics/metric-registry.ts
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type { MetricDefinition, AnalyticsDomain } from "./types.ts";

export interface IMetricRegistry {
  register(metric: Omit<MetricDefinition, "metricId">): MetricDefinition;
  get(metricKey: string): MetricDefinition | undefined;
  list(domain?: AnalyticsDomain): ReadonlyArray<MetricDefinition>;
  listActive(): ReadonlyArray<MetricDefinition>;
  findByTag(tag: string): ReadonlyArray<MetricDefinition>;
}

export class MetricRegistry implements IMetricRegistry {
  private readonly metrics = new Map<string, MetricDefinition>();

  public register(metric: Omit<MetricDefinition, "metricId">): MetricDefinition {
    if (this.metrics.has(metric.metricKey)) {
      return this.metrics.get(metric.metricKey)!;
    }
    const record: MetricDefinition = Object.freeze({
      metricId: randomUUID(),
      ...metric,
    });
    this.metrics.set(record.metricKey, record);
    return record;
  }

  public get(metricKey: string): MetricDefinition | undefined {
    return this.metrics.get(metricKey);
  }

  public list(domain?: AnalyticsDomain): ReadonlyArray<MetricDefinition> {
    const all = Array.from(this.metrics.values());
    return domain ? all.filter((m) => m.domain === domain) : all;
  }

  public listActive(): ReadonlyArray<MetricDefinition> {
    return Array.from(this.metrics.values()).filter((m) => m.isActive);
  }

  public findByTag(tag: string): ReadonlyArray<MetricDefinition> {
    return Array.from(this.metrics.values()).filter((m) => m.tags.includes(tag));
  }
}

// ---------------------------------------------------------------------------
// Platform Metric Definitions
// ---------------------------------------------------------------------------

const now = new Date().toISOString();

const PLATFORM_METRICS: Omit<MetricDefinition, "metricId">[] = [
  // Workshop Operations
  {
    metricKey: "avg_turnaround_time", label: "Avg Turnaround Time", description: "Average time from gate-in to delivery", unit: "MINUTES", aggregation: "AVG", domain: "WORKSHOP_OPERATIONS", dimensions: ["workshop_id", "service_type", "period_date"], targetValue: 180, warningThreshold: 240, criticalThreshold: 360, higherIsBetter: false, tags: ["SLA", "WORKSHOP", "CRITICAL"], isActive: true, introducedAt: now,
  },
  {
    metricKey: "first_time_fix_rate", label: "First Time Fix Rate", description: "Percentage of vehicles fixed on first attempt without rework", unit: "PERCENTAGE", aggregation: "AVG", domain: "WORKSHOP_OPERATIONS", dimensions: ["workshop_id", "technician_id", "period_date"], targetValue: 90, warningThreshold: 80, criticalThreshold: 70, higherIsBetter: true, tags: ["QUALITY", "WORKSHOP", "CRITICAL"], isActive: true, introducedAt: now,
  },
  {
    metricKey: "bay_utilization_rate", label: "Bay Utilization Rate", description: "Percentage of bay time actively used for repair vs total available time", unit: "PERCENTAGE", aggregation: "AVG", domain: "WORKSHOP_OPERATIONS", dimensions: ["workshop_id", "period_date"], targetValue: 85, warningThreshold: 70, criticalThreshold: 60, higherIsBetter: true, tags: ["EFFICIENCY", "WORKSHOP"], isActive: true, introducedAt: now,
  },
  {
    metricKey: "vehicles_delivered_count", label: "Vehicles Delivered", description: "Total vehicles delivered per period", unit: "COUNT", aggregation: "SUM", domain: "WORKSHOP_OPERATIONS", dimensions: ["workshop_id", "service_type", "period_date"], higherIsBetter: true, tags: ["THROUGHPUT", "WORKSHOP"], isActive: true, introducedAt: now,
  },
  {
    metricKey: "wip_pending_count", label: "WIP Pending", description: "Number of vehicles currently in WIP queue", unit: "COUNT", aggregation: "COUNT", domain: "WORKSHOP_OPERATIONS", dimensions: ["workshop_id", "period_date"], warningThreshold: 20, criticalThreshold: 40, higherIsBetter: false, tags: ["CAPACITY", "WORKSHOP"], isActive: true, introducedAt: now,
  },
  {
    metricKey: "technician_efficiency", label: "Technician Efficiency", description: "Standard hours achieved vs standard hours available", unit: "PERCENTAGE", aggregation: "AVG", domain: "WORKSHOP_OPERATIONS", dimensions: ["workshop_id", "technician_id", "period_date"], targetValue: 100, warningThreshold: 80, criticalThreshold: 60, higherIsBetter: true, tags: ["EFFICIENCY", "TECHNICIAN"], isActive: true, introducedAt: now,
  },
  // Financial
  {
    metricKey: "revenue_per_vehicle", label: "Revenue Per Vehicle", description: "Total revenue divided by vehicle count", unit: "INR", aggregation: "AVG", domain: "FINANCIAL", dimensions: ["workshop_id", "service_type", "period_month"], higherIsBetter: true, tags: ["REVENUE", "FINANCIAL"], isActive: true, introducedAt: now,
  },
  {
    metricKey: "gross_margin_percent", label: "Gross Margin %", description: "Gross profit as percentage of revenue", unit: "PERCENTAGE", aggregation: "AVG", domain: "FINANCIAL", dimensions: ["workshop_id", "revenue_category", "period_month"], targetValue: 40, warningThreshold: 30, criticalThreshold: 20, higherIsBetter: true, tags: ["FINANCIAL", "CRITICAL"], isActive: true, introducedAt: now,
  },
  {
    metricKey: "parts_revenue", label: "Parts Revenue", description: "Total revenue from parts sales", unit: "INR", aggregation: "SUM", domain: "FINANCIAL", dimensions: ["workshop_id", "period_month"], higherIsBetter: true, tags: ["REVENUE", "PARTS"], isActive: true, introducedAt: now,
  },
  {
    metricKey: "labour_revenue", label: "Labour Revenue", description: "Total revenue from labour charges", unit: "INR", aggregation: "SUM", domain: "FINANCIAL", dimensions: ["workshop_id", "period_month"], higherIsBetter: true, tags: ["REVENUE", "LABOUR"], isActive: true, introducedAt: now,
  },
  // Customer Experience
  {
    metricKey: "csi_score", label: "Customer Satisfaction Index", description: "Customer satisfaction score on 0–100 scale", unit: "SCORE", aggregation: "AVG", domain: "CUSTOMER_EXPERIENCE", dimensions: ["workshop_id", "service_type", "period_month"], targetValue: 85, warningThreshold: 75, criticalThreshold: 65, higherIsBetter: true, tags: ["CSI", "CUSTOMER", "CRITICAL"], isActive: true, introducedAt: now,
  },
  {
    metricKey: "nps_score", label: "Net Promoter Score", description: "Customer NPS", unit: "NPS_POINTS", aggregation: "AVG", domain: "CUSTOMER_EXPERIENCE", dimensions: ["workshop_id", "period_quarter"], targetValue: 50, warningThreshold: 30, criticalThreshold: 0, higherIsBetter: true, tags: ["NPS", "CUSTOMER"], isActive: true, introducedAt: now,
  },
  {
    metricKey: "complaint_resolution_rate", label: "Complaint Resolution Rate", description: "Percentage of complaints resolved within SLA", unit: "PERCENTAGE", aggregation: "AVG", domain: "CUSTOMER_EXPERIENCE", dimensions: ["workshop_id", "period_month"], targetValue: 95, warningThreshold: 85, criticalThreshold: 75, higherIsBetter: true, tags: ["COMPLAINTS", "CUSTOMER"], isActive: true, introducedAt: now,
  },
  // Business Programs
  {
    metricKey: "warranty_claim_approval_rate", label: "Warranty Claim Approval Rate", description: "Percentage of warranty claims approved", unit: "PERCENTAGE", aggregation: "AVG", domain: "BUSINESS_PROGRAMS", dimensions: ["workshop_id", "period_month"], higherIsBetter: true, tags: ["WARRANTY", "PROGRAMS"], isActive: true, introducedAt: now,
  },
  {
    metricKey: "warranty_recovery_amount", label: "Warranty Recovery Amount", description: "Total warranty claims recovered in INR", unit: "INR", aggregation: "SUM", domain: "BUSINESS_PROGRAMS", dimensions: ["workshop_id", "period_month"], higherIsBetter: true, tags: ["WARRANTY", "FINANCIAL"], isActive: true, introducedAt: now,
  },
  {
    metricKey: "amc_renewal_rate", label: "AMC Renewal Rate", description: "Percentage of AMC contracts renewed", unit: "PERCENTAGE", aggregation: "AVG", domain: "BUSINESS_PROGRAMS", dimensions: ["workshop_id", "period_quarter"], targetValue: 80, warningThreshold: 65, criticalThreshold: 50, higherIsBetter: true, tags: ["AMC", "PROGRAMS"], isActive: true, introducedAt: now,
  },
];

export function bootstrapMetrics(registry: IMetricRegistry): void {
  for (const metric of PLATFORM_METRICS) {
    registry.register(metric);
  }
}
