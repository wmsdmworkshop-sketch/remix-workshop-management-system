/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Timeline Query
 * Bounded Context: Core System / Timeline Platform
 * Description: Implements search, filter, and lifecycle replay query helpers.
 * =============================================================================
 */

import { TimelineStore, TimelineEvent } from "./timeline-store";

export class TimelineQuery {
  public static async getJobTimeline(jobCardId: number): Promise<TimelineEvent[]> {
    const all = await TimelineStore.getAll();
    return all.filter((e) => e.jobCardId === jobCardId);
  }

  public static async getVehicleTimeline(vehicleId: number): Promise<TimelineEvent[]> {
    const all = await TimelineStore.getAll();
    return all.filter((e) => e.vehicleId === vehicleId);
  }

  public static async getCustomerTimeline(customerId: number): Promise<TimelineEvent[]> {
    const all = await TimelineStore.getAll();
    return all.filter((e) => e.customerId === customerId);
  }

  public static async getEmployeeTimeline(employeeId: number): Promise<TimelineEvent[]> {
    const all = await TimelineStore.getAll();
    return all.filter((e) => e.employeeId === employeeId);
  }

  public static async getWorkshopTimeline(workshopId: number): Promise<TimelineEvent[]> {
    const all = await TimelineStore.getAll();
    return all.filter((e) => e.workshopId === workshopId);
  }

  public static async getBranchTimeline(branchId: number): Promise<TimelineEvent[]> {
    const all = await TimelineStore.getAll();
    return all.filter((e) => e.branchId === branchId);
  }

  /**
   * Replays chronologically and filters by criteria.
   */
  public static async searchAndFilter(filters: {
    sourceEngine?: string;
    eventType?: string;
    correlationId?: string;
  }): Promise<TimelineEvent[]> {
    let list = await TimelineStore.getAll();

    if (filters.sourceEngine) {
      list = list.filter((e) => e.sourceEngine === filters.sourceEngine);
    }
    if (filters.eventType) {
      list = list.filter((e) => e.eventType === filters.eventType);
    }
    if (filters.correlationId) {
      list = list.filter((e) => e.correlationId === filters.correlationId);
    }

    return list;
  }
}
