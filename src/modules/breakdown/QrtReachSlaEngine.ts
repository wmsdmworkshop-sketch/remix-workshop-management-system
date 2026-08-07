/**
 * DWIP Enterprise Platform - QrtReachSlaEngine
 * Tata Motors QRT Reach SLA Calculation Engine (2h Day / 4h Night)
 */

import { QrtReachSlaMetrics, QrtReachSlaStatus } from './types';

export class QrtReachSlaEngine {
  /**
   * Calculate OEM QRT Reach SLA strictly from ComplaintRegisteredAt to ReachedLocationAt
   */
  public static calculateSla(complaintRegisteredAt: string, reachedLocationAt?: string): QrtReachSlaMetrics {
    const regDate = new Date(complaintRegisteredAt);
    const hour = regDate.getHours();

    // Day Window: 06:00 to 22:00 (2 hours) | Night Window: 22:00 to 06:00 (4 hours)
    const isNightWindow = hour >= 22 || hour < 6;
    const targetMinutes = isNightWindow ? 240 : 120;

    const reachTargetTime = new Date(regDate.getTime() + targetMinutes * 60 * 1000).toISOString();

    const endDate = reachedLocationAt ? new Date(reachedLocationAt) : new Date();
    const elapsedMs = endDate.getTime() - regDate.getTime();
    const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / (1000 * 60)));
    const remainingMinutes = targetMinutes - elapsedMinutes;

    let slaStatus: QrtReachSlaStatus = 'ON_TRACK';
    if (remainingMinutes < 0) {
      slaStatus = 'BREACHED';
    } else if (remainingMinutes < 15) {
      slaStatus = 'WARNING';
    }

    return {
      complaintRegisteredAt,
      reachedLocationAt,
      isNightWindow,
      targetMinutes,
      reachTargetTime,
      elapsedMinutes,
      remainingMinutes,
      slaStatus
    };
  }
}
