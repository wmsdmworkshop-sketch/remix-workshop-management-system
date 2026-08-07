/**
 * DWIP Enterprise WOS - MemoryAuditRecorder
 * In-Memory Production Implementation of IAuditRecorder (No DB Schema Alterations)
 */

import { IAuditRecorder, AuditEvent, AuditQuery } from './types';

export class MemoryAuditRecorder implements IAuditRecorder {
  private store: AuditEvent[] = [];

  public async record(eventData: Omit<AuditEvent, 'id' | 'recordedAt'>): Promise<AuditEvent> {
    const id = `aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const event: AuditEvent = {
      ...eventData,
      id,
      recordedAt: new Date().toISOString()
    };
    this.store.unshift(event); // Order latest first
    return { ...event };
  }

  public async recordBatch(eventsData: Array<Omit<AuditEvent, 'id' | 'recordedAt'>>): Promise<AuditEvent[]> {
    const recorded: AuditEvent[] = [];
    for (const item of eventsData) {
      const rec = await this.record(item);
      recorded.push(rec);
    }
    return recorded;
  }

  public async query(query: AuditQuery): Promise<AuditEvent[]> {
    let results = this.store.filter(item => {
      if (query.entity && item.entity !== query.entity) return false;
      if (query.entityId && item.entityId !== query.entityId) return false;
      if (query.fieldName && item.fieldName !== query.fieldName) return false;
      if (query.changedBy && item.changedBy !== query.changedBy) return false;
      return true;
    });

    if (query.limit && query.limit > 0) {
      const offset = query.offset || 0;
      results = results.slice(offset, offset + query.limit);
    }

    return results;
  }
}

export const memoryAuditRecorder = new MemoryAuditRecorder();
