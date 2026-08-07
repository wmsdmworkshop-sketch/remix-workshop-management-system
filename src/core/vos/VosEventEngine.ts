/**
 * DWIP Enterprise - VOS Event Engine (Module 3)
 * Sprint 1 Architecture
 * 
 * Event sourcing engine that immutably logs every operational action.
 */

import { VosEvent } from './types';

export type VosEventListener = (event: VosEvent) => void | Promise<void>;

export class VosEventEngine {
  private static instance: VosEventEngine;
  private events: VosEvent[] = [];
  private listeners: Map<string, VosEventListener[]> = new Map();

  private constructor() {
    this.seedBaselineEvents();
  }

  public static getInstance(): VosEventEngine {
    if (!VosEventEngine.instance) {
      VosEventEngine.instance = new VosEventEngine();
    }
    return VosEventEngine.instance;
  }

  private seedBaselineEvents(): void {
    const now = new Date().toISOString();
    this.events.push({
      id: 'evt_101',
      vosId: 'vos_1001',
      eventType: 'VOS_CREATED',
      payload: { vin: 'MH12AB12345678901', registrationNumber: 'MH12AB1234' },
      actorId: 'usr_sec_1',
      actorRole: 'security_agent',
      correlationId: 'corr_init_1001',
      timestamp: now
    });
  }

  public async emitEvent(
    params: Omit<VosEvent, 'id' | 'timestamp'>
  ): Promise<VosEvent> {
    const event: VosEvent = {
      ...params,
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };

    this.events.unshift(event);

    // Notify listeners
    const targetListeners = this.listeners.get(event.eventType) || [];
    const wildcardListeners = this.listeners.get('*') || [];

    for (const listener of [...targetListeners, ...wildcardListeners]) {
      try {
        await listener(event);
      } catch (err) {
        console.error(`[VosEventEngine] Listener error for ${event.eventType}:`, err);
      }
    }

    return event;
  }

  public subscribe(eventType: string, listener: VosEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);

    return () => {
      const current = this.listeners.get(eventType) || [];
      this.listeners.set(
        eventType,
        current.filter(l => l !== listener)
      );
    };
  }

  public getEventsForVos(vosId: string): VosEvent[] {
    return this.events.filter(e => e.vosId === vosId);
  }

  public getAllEvents(): VosEvent[] {
    return [...this.events];
  }
}

export const vosEventEngine = VosEventEngine.getInstance();
