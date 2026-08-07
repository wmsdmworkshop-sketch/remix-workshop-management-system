/**
 * =============================================================================
 * DWIP Enterprise Analytics — KPI Catalog
 * Module: platforms/analytics/kpi-catalog.ts
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type { KPIDefinition, AnalyticsDomain } from "./types";

export interface IKPICatalog {
  register(kpi: Omit<KPIDefinition, "kpiId">): KPIDefinition;
  get(kpiKey: string): KPIDefinition | undefined;
  list(domain?: AnalyticsDomain): ReadonlyArray<KPIDefinition>;
  listActive(): ReadonlyArray<KPIDefinition>;
}

export class KPICatalog implements IKPICatalog {
  private readonly kpis = new Map<string, KPIDefinition>();

  public register(kpi: Omit<KPIDefinition, "kpiId">): KPIDefinition {
    if (this.kpis.has(kpi.kpiKey)) {
      return this.kpis.get(kpi.kpiKey)!;
    }
    const record: KPIDefinition = Object.freeze({
      kpiId: randomUUID(),
      ...kpi,
    });
    this.kpis.set(record.kpiKey, record);
    return record;
  }

  public get(kpiKey: string): KPIDefinition | undefined {
    return this.kpis.get(kpiKey);
  }

  public list(domain?: AnalyticsDomain): ReadonlyArray<KPIDefinition> {
    const all = Array.from(this.kpis.values());
    return domain ? all.filter((k) => k.domain === domain) : all;
  }

  public listActive(): ReadonlyArray<KPIDefinition> {
    return Array.from(this.kpis.values()).filter((k) => k.isActive);
  }
}

export const PLATFORM_KPIS: Omit<KPIDefinition, "kpiId">[] = [
  {
    kpiKey: "kpi_turnaround_time",
    label: "SLA Turnaround Time Target",
    description: "Keep average vehicle turnaround time under 3 hours (180 mins).",
    domain: "WORKSHOP_OPERATIONS",
    metricKey: "avg_turnaround_time",
    targetValue: 180,
    warningThreshold: 240,
    criticalThreshold: 360,
    unit: "MINUTES",
    granularity: "DAILY",
    owner: "Workshop Manager",
    reviewFrequency: "DAILY",
    tags: ["SLA", "OPERATIONS"],
    isActive: true
  },
  {
    kpiKey: "kpi_first_time_fix",
    label: "Quality FTFR Target",
    description: "Maintain first time fix rate above 90%.",
    domain: "WORKSHOP_OPERATIONS",
    metricKey: "first_time_fix_rate",
    targetValue: 90,
    warningThreshold: 80,
    criticalThreshold: 70,
    unit: "PERCENTAGE",
    granularity: "MONTHLY",
    owner: "QA Lead",
    reviewFrequency: "MONTHLY",
    tags: ["QUALITY", "REPAIR"],
    isActive: true
  },
  {
    kpiKey: "kpi_customer_satisfaction",
    label: "CSI Benchmark Target",
    description: "Customer service index target above 85 points.",
    domain: "CUSTOMER_EXPERIENCE",
    metricKey: "csi_score",
    targetValue: 85,
    warningThreshold: 75,
    criticalThreshold: 65,
    unit: "SCORE",
    granularity: "MONTHLY",
    owner: "CRM Lead",
    reviewFrequency: "MONTHLY",
    tags: ["CUSTOMER", "CSI"],
    isActive: true
  }
];

export function bootstrapKPIs(registry: IKPICatalog): void {
  for (const kpi of PLATFORM_KPIS) {
    registry.register(kpi);
  }
}
