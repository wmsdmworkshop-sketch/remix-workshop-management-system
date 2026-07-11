/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Timeline Engine
 * Bounded Context: Core System / Timeline Platform
 * Description: Listens to domain events on EventBus and appends timeline logs.
 * =============================================================================
 */

import { IEventBus } from "../event-bus";
import { TimelineStore, TimelineEvent } from "./timeline-store";

export class TimelineEngine {
  constructor(private readonly eventBus: IEventBus) {}

  /**
   * Initializes event listeners to build the timeline asynchronously.
   */
  public initialize(): void {
    // Listen to workflow events
    this.eventBus.subscribe("WORKFLOW_TRANSITIONED", async (evt: any) => {
      await this.appendEventFromBus("Workflow", "TRANSITION", evt);
    });

    // Listen to notification events
    this.eventBus.subscribe("NOTIFICATION_SENT", async (evt: any) => {
      await this.appendEventFromBus("Notification", "SENT", evt);
    });

    // Listen to escalation events
    this.eventBus.subscribe("SLA_ESCALATED", async (evt: any) => {
      await this.appendEventFromBus("Escalation", "BREACH", evt);
    });

    // Listen to queue events
    this.eventBus.subscribe("QUEUE_ENQUEUED", async (evt: any) => {
      await this.appendEventFromBus("Queue", "ENQUEUE", evt);
    });
  }

  /**
   * Directly appends an event to the timeline ledger.
   */
  public async append(event: TimelineEvent): Promise<void> {
    await TimelineStore.append(event);
  }

  private async appendEventFromBus(source: string, type: string, busEvent: any): Promise<void> {
    const payload = busEvent.payload;

    const event: TimelineEvent = {
      timelineId: `TL-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      correlationId: busEvent.correlationId || "SYSTEM",
      validationRunId: busEvent.validationRunId,
      workshopId: payload.workshopId || 1,
      branchId: payload.branchId || 10,
      jobCardId: payload.jobId || payload.jobCardId || 1,
      vehicleId: payload.vehicleId || 1,
      customerId: payload.customerId || 1,
      sourceEngine: source,
      eventType: type,
      eventName: busEvent.name,
      timestamp: new Date().toISOString(),
      priority: payload.priority || "LOW",
    };

    await this.append(event);
  }
}
