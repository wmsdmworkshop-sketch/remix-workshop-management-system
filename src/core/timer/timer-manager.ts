/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Timer Manager
 * Bounded Context: Core System / Timer Platform
 * Description: Coordinates registration, retrieval, and mapping of active timers.
 * =============================================================================
 */

import { TimerStore, EnterpriseTimerRecord } from "./timer-store";

export class TimerManager {
  public async getTimer(timerId: string): Promise<EnterpriseTimerRecord | null> {
    return TimerStore.get(timerId);
  }

  public async getActiveTimers(): Promise<EnterpriseTimerRecord[]> {
    return TimerStore.getActiveTimers();
  }

  /**
   * Groups all running timers by Workshop ID.
   */
  public async getActiveTimersByWorkshop(workshopId: number): Promise<EnterpriseTimerRecord[]> {
    const allActive = await TimerStore.getActiveTimers();
    return allActive.filter((t) => t.workshopId === workshopId);
  }

  /**
   * Groups all running timers by Job Card ID.
   */
  public async getActiveTimersByJob(jobId: number): Promise<EnterpriseTimerRecord[]> {
    const allActive = await TimerStore.getActiveTimers();
    return allActive.filter((t) => t.jobId === jobId);
  }
}
