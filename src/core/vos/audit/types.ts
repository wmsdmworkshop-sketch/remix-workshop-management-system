/**
 * DWIP Enterprise WOS - Audit Engine Models & Interfaces
 * Task 1.5 Audit Event Models & IAuditRecorder Interface
 */

export interface FieldChange {
  fieldName: string;
  previousValue: string | null;
  newValue: string | null;
  changeType: 'VALUE_UPDATED' | 'NULL_TO_VALUE' | 'VALUE_TO_NULL' | 'INITIAL_SET';
}

export interface AuditEvent {
  id: string;
  entity: string;
  entityId: string;
  fieldName: string;
  previousValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedByRole: string;
  reason?: string;
  correlationId?: string;
  recordedAt: string;
}

export interface AuditQuery {
  entity?: string;
  entityId: string;
  fieldName?: string;
  changedBy?: string;
  limit?: number;
  offset?: number;
}

export interface IAuditRecorder {
  record(event: Omit<AuditEvent, 'id' | 'recordedAt'>): Promise<AuditEvent>;
  recordBatch(events: Array<Omit<AuditEvent, 'id' | 'recordedAt'>>): Promise<AuditEvent[]>;
  query(query: AuditQuery): Promise<AuditEvent[]>;
}
