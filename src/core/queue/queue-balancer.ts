/**
 * =============================================================================
 * WOS Core Architecture: Queue Balancer
 * Bounded Context: Core System / Queue Platform
 * Description: Assigns queue items to personnel based on load and capacity constraints.
 * =============================================================================
 */

import { QueueEngine, QueueItem } from "./queue-engine";

export interface BalancerCandidate {
  staffId: number;
  role: "ADVISOR" | "TECHNICIAN";
  skillLevel: number; // 1 to 5
  activeLoad: number; // count of current processing items
  isAvailable: boolean;
}

export class QueueBalancer {
  constructor(private readonly engine: QueueEngine) {}

  /**
   * Finds the optimal candidate for a queue item based on skill, availability, and active load.
   */
  public findOptimalStaff(
    candidates: BalancerCandidate[],
    requiredSkill: number = 1
  ): BalancerCandidate | null {
    const eligible = candidates.filter((c) => c.isAvailable && c.skillLevel >= requiredSkill);
    if (eligible.length === 0) return null;

    // Balance by sorting candidates:
    // 1. Least active load (Primary balancer factor)
    // 2. Highest skill level (Secondary balancer factor)
    eligible.sort((a, b) => {
      if (a.activeLoad !== b.activeLoad) {
        return a.activeLoad - b.activeLoad;
      }
      return b.skillLevel - a.skillLevel;
    });

    return eligible[0];
  }

  /**
   * Automatically balances and assigns waiting items to candidates.
   */
  public async balanceQueue(
    queueName: any,
    workshopId: number,
    candidates: BalancerCandidate[],
    correlationId: string
  ): Promise<number> {
    const items = await this.engine.getQueueItems(queueName, workshopId);
    const waitingItems = items.filter((i) => i.status === "WAITING");
    let assignmentsCount = 0;

    for (const item of waitingItems) {
      const staff = this.findOptimalStaff(candidates);
      if (staff) {
        await this.engine.reassign(item.itemId, staff.staffId, correlationId);
        staff.activeLoad += 1; // update load dynamically
        assignmentsCount++;
      }
    }

    return assignmentsCount;
  }
}
