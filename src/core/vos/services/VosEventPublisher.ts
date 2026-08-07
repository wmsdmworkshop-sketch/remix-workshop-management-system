/**
 * DWIP Enterprise WOS - VosEventPublisher
 * Task 1.2 Event Readiness No-Op Extension Points
 */

export interface DomainEvent {
  eventId: string;
  eventType: string;
  vosId: string;
  payload: Record<string, any>;
  occurredAt: string;
}

export class VosEventPublisher {
  private static noopListeners: Array<(event: DomainEvent) => void> = [];

  /**
   * No-op domain event publisher extension hook
   */
  public async publish(eventType: string, vosId: string, payload: Record<string, any>): Promise<DomainEvent> {
    const event: DomainEvent = {
      eventId: `devt_${Date.now()}`,
      eventType,
      vosId,
      payload,
      occurredAt: new Date().toISOString()
    };

    for (const listener of VosEventPublisher.noopListeners) {
      try {
        listener(event);
      } catch {
        // No-op protection
      }
    }

    return event;
  }

  public registerNoOpListener(listener: (event: DomainEvent) => void): () => void {
    VosEventPublisher.noopListeners.push(listener);
    return () => {
      VosEventPublisher.noopListeners = VosEventPublisher.noopListeners.filter(l => l !== listener);
    };
  }
}

export const vosEventPublisher = new VosEventPublisher();
