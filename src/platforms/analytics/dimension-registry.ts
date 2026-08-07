/**
 * =============================================================================
 * DWIP Enterprise Analytics — Dimension Registry
 * Module: platforms/analytics/dimension-registry.ts
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type { DimensionDefinition, DimensionType, AnalyticsDomain } from "./types.ts";

export interface IDimensionRegistry {
  register(dimension: Omit<DimensionDefinition, "dimensionId">): DimensionDefinition;
  get(dimensionKey: string): DimensionDefinition | undefined;
  list(domain?: AnalyticsDomain): ReadonlyArray<DimensionDefinition>;
  listByType(type: DimensionType): ReadonlyArray<DimensionDefinition>;
}

export class DimensionRegistry implements IDimensionRegistry {
  private readonly dimensions = new Map<string, DimensionDefinition>();

  public register(dimension: Omit<DimensionDefinition, "dimensionId">): DimensionDefinition {
    if (this.dimensions.has(dimension.dimensionKey)) {
      return this.dimensions.get(dimension.dimensionKey)!;
    }
    const record: DimensionDefinition = Object.freeze({
      dimensionId: randomUUID(),
      ...dimension,
    });
    this.dimensions.set(record.dimensionKey, record);
    return record;
  }

  public get(dimensionKey: string): DimensionDefinition | undefined {
    return this.dimensions.get(dimensionKey);
  }

  public list(domain?: AnalyticsDomain): ReadonlyArray<DimensionDefinition> {
    const all = Array.from(this.dimensions.values());
    return domain ? all.filter((d) => d.domain === domain) : all;
  }

  public listByType(type: DimensionType): ReadonlyArray<DimensionDefinition> {
    return Array.from(this.dimensions.values()).filter((d) => d.type === type);
  }
}

// ---------------------------------------------------------------------------
// Platform Dimension Definitions
// ---------------------------------------------------------------------------

export const PLATFORM_DIMENSIONS: Omit<DimensionDefinition, "dimensionId">[] = [
  { dimensionKey: "workshop_id", label: "Workshop", type: "CATEGORICAL", domain: "WORKSHOP_OPERATIONS", description: "Workshop identifier", isRequired: false },
  { dimensionKey: "dealer_id", label: "Dealer", type: "HIERARCHICAL", domain: "WORKSHOP_OPERATIONS", description: "Dealer identifier", hierarchy: ["DEALER", "WORKSHOP"], isRequired: false },
  { dimensionKey: "technician_id", label: "Technician", type: "CATEGORICAL", domain: "WORKSHOP_OPERATIONS", description: "Technician user ID", isRequired: false },
  { dimensionKey: "service_type", label: "Service Type", type: "CATEGORICAL", domain: "WORKSHOP_OPERATIONS", description: "Type of service (General, Major, etc.)", possibleValues: ["GENERAL_SERVICE", "MAJOR_SERVICE", "RUNNING_REPAIR", "ACCIDENTAL"], isRequired: false },
  { dimensionKey: "vehicle_brand", label: "Vehicle Brand", type: "CATEGORICAL", domain: "WORKSHOP_OPERATIONS", description: "Vehicle manufacturer brand", isRequired: false },
  { dimensionKey: "vehicle_model", label: "Vehicle Model", type: "CATEGORICAL", domain: "WORKSHOP_OPERATIONS", description: "Vehicle model name", isRequired: false },
  { dimensionKey: "job_stage", label: "Job Stage", type: "CATEGORICAL", domain: "WORKSHOP_OPERATIONS", description: "Current stage in the job lifecycle", possibleValues: ["GATE_IN", "DIAGNOSTIC", "ESTIMATION", "WIP", "QC", "DELIVERY"], isRequired: false },
  { dimensionKey: "period_date", label: "Date", type: "TEMPORAL", domain: "ENTERPRISE", description: "Calendar date", isRequired: false },
  { dimensionKey: "period_month", label: "Month", type: "TEMPORAL", domain: "ENTERPRISE", description: "Calendar month (YYYY-MM)", isRequired: false },
  { dimensionKey: "period_quarter", label: "Quarter", type: "TEMPORAL", domain: "ENTERPRISE", description: "Calendar quarter (YYYY-QN)", isRequired: false },
  { dimensionKey: "customer_segment", label: "Customer Segment", type: "CATEGORICAL", domain: "CUSTOMER_EXPERIENCE", description: "Customer segmentation bucket", possibleValues: ["PREMIUM", "STANDARD", "FLEET", "CORPORATE"], isRequired: false },
  { dimensionKey: "business_program", label: "Business Program", type: "CATEGORICAL", domain: "BUSINESS_PROGRAMS", description: "Business program type", possibleValues: ["WARRANTY", "AMC", "GOODWILL", "INSURANCE", "FLEET", "BREAKDOWN"], isRequired: false },
  { dimensionKey: "claim_status", label: "Claim Status", type: "CATEGORICAL", domain: "BUSINESS_PROGRAMS", description: "Status of claim", possibleValues: ["SUBMITTED", "APPROVED", "REJECTED", "SETTLED"], isRequired: false },
  { dimensionKey: "revenue_category", label: "Revenue Category", type: "CATEGORICAL", domain: "FINANCIAL", description: "Revenue classification", possibleValues: ["LABOUR", "PARTS", "LUBRICANTS", "SUBLET", "AMC"], isRequired: false },
  { dimensionKey: "fleet_owner_id", label: "Fleet Owner", type: "CATEGORICAL", domain: "FLEET", description: "Fleet owner identifier", isRequired: false },
];

export function bootstrapDimensions(registry: IDimensionRegistry): void {
  for (const dim of PLATFORM_DIMENSIONS) {
    registry.register(dim);
  }
}
