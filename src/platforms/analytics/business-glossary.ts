/**
 * =============================================================================
 * DWIP Enterprise Analytics — Business Glossary
 * Module: platforms/analytics/business-glossary.ts
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type { BusinessTerm, AnalyticsDomain } from "./types";

export interface IBusinessGlossary {
  register(term: Omit<BusinessTerm, "termId">): BusinessTerm;
  get(termName: string): BusinessTerm | undefined;
  list(domain?: AnalyticsDomain): ReadonlyArray<BusinessTerm>;
}

export class BusinessGlossary implements IBusinessGlossary {
  private readonly terms = new Map<string, BusinessTerm>();

  public register(term: Omit<BusinessTerm, "termId">): BusinessTerm {
    const key = term.term.toLowerCase();
    if (this.terms.has(key)) {
      return this.terms.get(key)!;
    }
    const record: BusinessTerm = Object.freeze({
      termId: randomUUID(),
      ...term,
    });
    this.terms.set(key, record);
    return record;
  }

  public get(termName: string): BusinessTerm | undefined {
    return this.terms.get(termName.toLowerCase());
  }

  public list(domain?: AnalyticsDomain): ReadonlyArray<BusinessTerm> {
    const all = Array.from(this.terms.values());
    return domain ? all.filter((t) => t.domain === domain) : all;
  }
}

const now = new Date().toISOString();

export const PLATFORM_GLOSSARY_TERMS: Omit<BusinessTerm, "termId">[] = [
  {
    term: "Turnaround Time",
    abbreviation: "TAT",
    domain: "WORKSHOP_OPERATIONS",
    definition: "The total elapsed duration from when a vehicle gates in to the workshop until it is finally released (gate-out) to the customer.",
    example: "A general repair job gates in at 09:00 AM and is delivered at 03:00 PM, resulting in a TAT of 360 minutes (6 hours).",
    relatedMetrics: ["avg_turnaround_time"],
    synonyms: ["Cycle Time", "Lead Time"],
    owner: "Head of Workshop Operations",
    approvedAt: now,
  },
  {
    term: "First Time Fix Rate",
    abbreviation: "FTFR",
    domain: "WORKSHOP_OPERATIONS",
    definition: "The percentage of repair jobs resolved correctly on the first visit without requiring repeat visits or rework logs for the same complaint within 30 days.",
    example: "If a workshop resolves 95 out of 100 vehicles on their first visit, the FTFR is 95%.",
    relatedMetrics: ["first_time_fix_rate"],
    synonyms: ["Right First Time", "RFT"],
    owner: "Quality Assurance Director",
    approvedAt: now,
  },
  {
    term: "Customer Satisfaction Index",
    abbreviation: "CSI",
    domain: "CUSTOMER_EXPERIENCE",
    definition: "A standardized index measured from post-service surveys scoring from 0 to 100 capturing customer experience quality.",
    example: "Average survey response score for a month translates to a CSI of 88.",
    relatedMetrics: ["csi_score"],
    synonyms: ["CSAT"],
    owner: "Customer Experience Manager",
    approvedAt: now,
  }
];

export function bootstrapGlossary(registry: IBusinessGlossary): void {
  for (const term of PLATFORM_GLOSSARY_TERMS) {
    registry.register(term);
  }
}
