// =============================================================================
// WOS Workflow Domain Events Publisher (Phase 4)
// Bounded Context: Event Publisher / Decoupled Communication
// =============================================================================

import { FEATURE_FLAGS } from "./config";
import { WorkflowLogger, LogPayload } from "./logger";

export interface WorkflowDomainEvent {
  eventId: string;
  eventName: string;
  jobId: number;
  oldState: string;
  newState: string;
  timestamp: string;
  actorId: number;
  actorRole: string;
  correlationId: string;
}

export type WorkflowEventHandler = (event: WorkflowDomainEvent) => void | Promise<void>;

export class WorkflowEventPublisher {
  private static handlers: Map<string, WorkflowEventHandler[]> = new Map();

  /**
   * Subscribe to specific workflow event topics or wildcard '*'.
   */
  public static subscribe(topic: string, handler: WorkflowEventHandler) {
    const list = this.handlers.get(topic) || [];
    list.push(handler);
    this.handlers.set(topic, list);
  }

  /**
   * Publish a transition domain event.
   */
  public static async publish(
    jobId: number,
    oldState: string,
    newState: string,
    actorId: number,
    actorRole: string,
    logContext: LogPayload
  ): Promise<WorkflowDomainEvent | null> {
    if (!FEATURE_FLAGS.enableEventPublishing) {
      WorkflowLogger.info("Event publishing disabled via feature flags.", logContext);
      return null;
    }

    const event: WorkflowDomainEvent = {
      eventId: `EV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      eventName: `JOB_STATE_TRANSITION_${newState}`,
      jobId,
      oldState,
      newState,
      timestamp: new Date().toISOString(),
      actorId,
      actorRole,
      correlationId: logContext.correlationId,
    };

    WorkflowLogger.info(`Publishing event: ${event.eventName}`, { ...logContext, eventId: event.eventId });

    // Execute handlers matching the specific state or wildcard
    const specificHandlers = this.handlers.get(newState) || [];
    const wildcardHandlers = this.handlers.get("*") || [];
    const allHandlers = [...specificHandlers, ...wildcardHandlers];

    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (err) {
        WorkflowLogger.error("Failed executing event handler", err, logContext);
      }
    }

    return event;
  }
}
