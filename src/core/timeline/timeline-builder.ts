/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Timeline Builder
 * Bounded Context: Core System / Timeline Platform
 * Description: Factory builder to construct standard TimelineEvent structures.
 * =============================================================================
 */

import { TimelineEvent } from "./timeline-store";

export class TimelineBuilder {
  public static build(params: {
    timelineId: string;
    correlationId: string;
    validationRunId?: string;
    workshopId: number;
    branchId: number;
    jobCardId: number;
    vehicleId: number;
    customerId: number;
    employeeId?: number;
    role?: string;
    sourceEngine: string;
    eventType: string;
    eventName: string;
    workflowState?: string;
    queue?: string;
    oldValue?: string;
    newValue?: string;
    duration?: number;
    priority?: string;
    location?: string;
    device?: string;
    aiContext?: string;
    decisionId?: string;
    auditId?: string;
  }): TimelineEvent {
    return {
      ...params,
      timestamp: new Date().toISOString(),
    };
  }
}
