/**
 * DWIP Enterprise WOS - Timeline Engine Models & Event Types
 * Task 1.4 Append-Only Timeline Event Models
 */

import { TimelineCategory, SlaStatus, IVosTimeline } from '../../../domain/vos/types';

export type TimelineEventSource =
  | 'STATE_ENGINE'
  | 'USER_ACTION'
  | 'SYSTEM'
  | 'OEM'
  | 'API'
  | 'INTEGRATION';

export interface TimelineEvent {
  vosId: string;
  timelineCategory: TimelineCategory;
  eventType: string;
  title: string;
  description?: string;
  source: TimelineEventSource;
  structuredMetadata?: Record<string, any>;
  slaStatus?: SlaStatus;
  recordedAt?: string;
}

export interface TimelineQuery {
  vosId: string;
  category?: TimelineCategory;
  eventType?: string;
  source?: TimelineEventSource;
  limit?: number;
  offset?: number;
}

export const TimelineEventTypes = {
  // Operational Events
  GATE_IN_REGISTERED: 'GATE_IN_REGISTERED',
  INSPECTION_COMPLETED: 'INSPECTION_COMPLETED',
  ESTIMATE_GENERATED: 'ESTIMATE_GENERATED',
  ESTIMATE_APPROVED: 'ESTIMATE_APPROVED',
  WORK_STARTED: 'WORK_STARTED',
  WORK_COMPLETED: 'WORK_COMPLETED',
  QC_PASSED: 'QC_PASSED',
  QC_FAILED: 'QC_FAILED',
  INVOICE_GENERATED: 'INVOICE_GENERATED',
  PAYMENT_SETTLED: 'PAYMENT_SETTLED',
  GATE_OUT_REGISTERED: 'GATE_OUT_REGISTERED',
  SESSION_CLOSED: 'SESSION_CLOSED',
  STATE_TRANSITION: 'STATE_TRANSITION',

  // SLA Milestones
  SLA_WARNING_TRIGGERED: 'SLA_WARNING_TRIGGERED',
  SLA_BREACH_TRIGGERED: 'SLA_BREACH_TRIGGERED',
  SLA_RECOVERED: 'SLA_RECOVERED',

  // OEM & Telematics Events
  OEM_CAMPAIGN_FLAGGED: 'OEM_CAMPAIGN_FLAGGED',
  OEM_WARRANTY_APPROVED: 'OEM_WARRANTY_APPROVED',
  OEM_TELEMATICS_ALERT: 'OEM_TELEMATICS_ALERT',

  // Telemetry Repeatable Events (Allowed Duplicates)
  TELEMETRY_SCAN: 'TELEMETRY_SCAN',
  DIAGNOSTIC_LOG: 'DIAGNOSTIC_LOG'
} as const;

export type TimelineEventTypeKey = keyof typeof TimelineEventTypes;
