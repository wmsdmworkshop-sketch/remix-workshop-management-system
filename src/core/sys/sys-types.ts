export interface AuditEvent {
  eventType: string;
  module: string;
  userId: string;
  referenceId: string;
  oldValueJson?: string;
  newValueJson?: string;
  ipAddress?: string;
  isSensitive?: boolean;
}
