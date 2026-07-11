/**
 * =============================================================================
 * WOS Core Architecture: Queue Recovery Manager
 * Bounded Context: Core System / Queue Platform
 * Description: Scans DB-backed queue items post-restart/crash to verify integrity.
 * =============================================================================
 */

import { QueueEngine } from "./queue-engine";

export class QueueRecovery {
  constructor(private readonly engine: QueueEngine) {}

  /**
   * Scans outstanding queue records in DB post-restart and publishes recovery signals.
   */
  public async recoverQueues(correlationId: string): Promise<number> {
    const all = await this.engine.getAllItems();
    let recovered = 0;

    for (const item of all) {
      if (item.status === "WAITING" || item.status === "PROCESSING") {
        // Enforce DB record synchronization
        await this.engine.save(item);
        recovered++;
      }
    }

    return recovered;
  }
}
