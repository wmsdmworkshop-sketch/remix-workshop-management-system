/**
 * DWIP Enterprise Integration Gateway - IntegrationEventPublisher
 * Integration Events: SyncStarted, SyncCompleted, SyncFailed, ConflictDetected, TokenRefreshed, QueueProcessed
 */

import { StructuredLogger } from '../../vos/utils/StructuredLogger';

export type IntegrationEventType =
  | 'SyncStarted'
  | 'SyncCompleted'
  | 'SyncFailed'
  | 'ConflictDetected'
  | 'TokenRefreshed'
  | 'QueueProcessed';

export interface IntegrationEventPayload {
  eventType: IntegrationEventType;
  providerId: string;
  timestamp: string;
  details?: Record<string, any>;
  correlationId?: string;
}

export type IntegrationEventListener = (event: IntegrationEventPayload) => void;

export class IntegrationEventPublisher {
  private listeners: IntegrationEventListener[] = [];

  public subscribe(listener: IntegrationEventListener): void {
    this.listeners.push(listener);
  }

  public publish(event: IntegrationEventPayload): void {
    StructuredLogger.info(`Published IntegrationEvent: ${event.eventType}`, {
      component: 'IntegrationEventPublisher',
      operation: 'publish',
      result: 'SUCCESS',
      eventType: event.eventType,
      providerId: event.providerId,
      correlationId: event.correlationId
    });

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        // Non-blocking event listener guard
      }
    }
  }
}

export const integrationEventPublisher = new IntegrationEventPublisher();
