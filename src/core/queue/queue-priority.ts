/**
 * =============================================================================
 * WOS Core Architecture: Queue Priority Rules
 * Bounded Context: Core System / Queue Platform
 * Description: Computes dynamic priority scores for queue balancing and ordering.
 * =============================================================================
 */

export interface PriorityFactors {
  isEmergency?: boolean;
  isVip?: boolean;
  isFleet?: boolean;
  isWarranty?: boolean;
  isBreakdown?: boolean;
  isCarryForward?: boolean;
  isCustomerWaiting?: boolean;
  isRepeatComplaint?: boolean;
  managerOverrideBonus?: number;
  entryTime: string;
}

export class QueuePriority {
  /**
   * Calculates a dynamic numerical priority score (higher score = higher priority).
   * Automatically scales over time (aging) to prevent starvation.
   */
  public static calculateScore(factors: PriorityFactors): number {
    let score = 100; // Base score

    if (factors.isEmergency) score += 1000;
    if (factors.isBreakdown) score += 800;
    if (factors.isVip) score += 600;
    if (factors.isCustomerWaiting) score += 400;
    if (factors.isFleet) score += 300;
    if (factors.isRepeatComplaint) score += 250;
    if (factors.isCarryForward) score += 200;
    if (factors.isWarranty) score += 150;

    if (factors.managerOverrideBonus) {
      score += factors.managerOverrideBonus;
    }

    // Dynamic Priority: Aging factor (adds 1 point per elapsed minute)
    const elapsedMs = Date.now() - new Date(factors.entryTime).getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 1000 / 60);
    score += elapsedMinutes;

    return score;
  }
}
