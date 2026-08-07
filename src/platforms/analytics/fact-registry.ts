/**
 * =============================================================================
 * DWIP Enterprise Analytics — Fact Registry
 * Module: platforms/analytics/fact-registry.ts
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type { FactDefinition, AnalyticsDomain } from "./types";

export interface IFactRegistry {
  register(fact: Omit<FactDefinition, "factId">): FactDefinition;
  get(factKey: string): FactDefinition | undefined;
  list(domain?: AnalyticsDomain): ReadonlyArray<FactDefinition>;
}

export class FactRegistry implements IFactRegistry {
  private readonly facts = new Map<string, FactDefinition>();

  public register(fact: Omit<FactDefinition, "factId">): FactDefinition {
    if (this.facts.has(fact.factKey)) {
      return this.facts.get(fact.factKey)!;
    }
    const record: FactDefinition = Object.freeze({
      factId: randomUUID(),
      ...fact,
    });
    this.facts.set(record.factKey, record);
    return record;
  }

  public get(factKey: string): FactDefinition | undefined {
    return this.facts.get(factKey);
  }

  public list(domain?: AnalyticsDomain): ReadonlyArray<FactDefinition> {
    const all = Array.from(this.facts.values());
    return domain ? all.filter((f) => f.domain === domain) : all;
  }
}

const now = new Date().toISOString();

export const PLATFORM_FACTS: Omit<FactDefinition, "factId">[] = [
  {
    factKey: "fact_job_card_lifecycle",
    label: "Job Card Lifecycle Fact",
    description: "Granular fact records of job card lifecycle status transitions",
    domain: "WORKSHOP_OPERATIONS",
    sourceEvents: ["VEHICLE_GATE_IN", "WIP_STARTED", "QC_COMPLETED", "VEHICLE_RELEASED"],
    dimensions: ["workshop_id", "technician_id", "service_type", "vehicle_model", "period_date"],
    measures: ["avg_turnaround_time", "vehicles_delivered_count", "bay_utilization_rate"],
    granularity: "DAILY",
    retentionDays: 365,
  },
  {
    factKey: "fact_financial_transactions",
    label: "Financial Transactions Fact",
    description: "Records of invoice values, payments, recovery claims",
    domain: "FINANCIAL",
    sourceEvents: ["INVOICE_GENERATED", "WARRANTY_CLAIM_SUBMITTED", "AMC_RENEWED"],
    dimensions: ["workshop_id", "revenue_category", "business_program", "period_month"],
    measures: ["revenue_per_vehicle", "parts_revenue", "labour_revenue", "gross_margin_percent"],
    granularity: "MONTHLY",
    retentionDays: 730,
  },
  {
    factKey: "fact_customer_interactions",
    label: "Customer Interactions Fact",
    description: "Tracks customer timeline events, satisfaction ratings and NPS responses",
    domain: "CUSTOMER_EXPERIENCE",
    sourceEvents: ["RECOMMENDATION_APPROVED", "RECOMMENDATION_REJECTED", "BREAKDOWN_LOGGED"],
    dimensions: ["workshop_id", "customer_segment", "period_month"],
    measures: ["csi_score", "nps_score", "complaint_resolution_rate"],
    granularity: "MONTHLY",
    retentionDays: 365,
  }
];

export function bootstrapFacts(registry: IFactRegistry): void {
  for (const fact of PLATFORM_FACTS) {
    registry.register(fact);
  }
}
