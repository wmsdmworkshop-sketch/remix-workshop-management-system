/**
 * DWIP Enterprise WOS - TimelineEventRegistry
 * Configurable Registry of Registered Timeline Event Types & Deduplication Metadata
 */

import { TimelineCategory } from '../../../domain/vos/types';
import { TimelineEventTypes } from './types';

export interface EventRegistrationConfig {
  eventType: string;
  category: TimelineCategory;
  deduplicate: boolean; // If true, only one entry allowed per VOS unless compensating
  description: string;
}

export class TimelineEventRegistry {
  private static registry: Map<string, EventRegistrationConfig> = new Map();

  static {
    TimelineEventRegistry.registerDefaults();
  }

  private static registerDefaults(): void {
    // 1. Operational Milestones (Deduplicated)
    const operationalEvents = [
      TimelineEventTypes.GATE_IN_REGISTERED,
      TimelineEventTypes.INSPECTION_COMPLETED,
      TimelineEventTypes.ESTIMATE_GENERATED,
      TimelineEventTypes.ESTIMATE_APPROVED,
      TimelineEventTypes.WORK_STARTED,
      TimelineEventTypes.WORK_COMPLETED,
      TimelineEventTypes.QC_PASSED,
      TimelineEventTypes.QC_FAILED,
      TimelineEventTypes.INVOICE_GENERATED,
      TimelineEventTypes.PAYMENT_SETTLED,
      TimelineEventTypes.GATE_OUT_REGISTERED,
      TimelineEventTypes.SESSION_CLOSED
    ];

    for (const evt of operationalEvents) {
      TimelineEventRegistry.registry.set(evt, {
        eventType: evt,
        category: TimelineCategory.OPERATIONAL,
        deduplicate: true,
        description: `Operational milestone event: ${evt}`
      });
    }

    // State transition event (Non-deduplicated, allows tracking every transition)
    TimelineEventRegistry.registry.set(TimelineEventTypes.STATE_TRANSITION, {
      eventType: TimelineEventTypes.STATE_TRANSITION,
      category: TimelineCategory.OPERATIONAL,
      deduplicate: false,
      description: 'VOS state transition event'
    });

    // 2. SLA Events (Deduplicated per status trigger)
    TimelineEventRegistry.registry.set(TimelineEventTypes.SLA_WARNING_TRIGGERED, {
      eventType: TimelineEventTypes.SLA_WARNING_TRIGGERED,
      category: TimelineCategory.INTERNAL_SLA,
      deduplicate: true,
      description: 'Internal SLA warning threshold reached (70%)'
    });
    TimelineEventRegistry.registry.set(TimelineEventTypes.SLA_BREACH_TRIGGERED, {
      eventType: TimelineEventTypes.SLA_BREACH_TRIGGERED,
      category: TimelineCategory.INTERNAL_SLA,
      deduplicate: true,
      description: 'Internal SLA breach threshold reached (90%+)'
    });
    TimelineEventRegistry.registry.set(TimelineEventTypes.SLA_RECOVERED, {
      eventType: TimelineEventTypes.SLA_RECOVERED,
      category: TimelineCategory.INTERNAL_SLA,
      deduplicate: false,
      description: 'SLA recovered after mitigation'
    });

    // 3. OEM Events
    TimelineEventRegistry.registry.set(TimelineEventTypes.OEM_CAMPAIGN_FLAGGED, {
      eventType: TimelineEventTypes.OEM_CAMPAIGN_FLAGGED,
      category: TimelineCategory.OEM,
      deduplicate: true,
      description: 'OEM recall campaign flagged'
    });
    TimelineEventRegistry.registry.set(TimelineEventTypes.OEM_WARRANTY_APPROVED, {
      eventType: TimelineEventTypes.OEM_WARRANTY_APPROVED,
      category: TimelineCategory.OEM,
      deduplicate: true,
      description: 'OEM warranty claim pre-approval'
    });
    TimelineEventRegistry.registry.set(TimelineEventTypes.OEM_TELEMATICS_ALERT, {
      eventType: TimelineEventTypes.OEM_TELEMATICS_ALERT,
      category: TimelineCategory.OEM,
      deduplicate: false,
      description: 'OEM telematics diagnostic alert'
    });

    // 4. Repeatable Telemetry Events (Allowed Duplicates)
    TimelineEventRegistry.registry.set(TimelineEventTypes.TELEMETRY_SCAN, {
      eventType: TimelineEventTypes.TELEMETRY_SCAN,
      category: TimelineCategory.OPERATIONAL,
      deduplicate: false,
      description: 'Repeatable IoT sensor / telematic diagnostic scan'
    });
    TimelineEventRegistry.registry.set(TimelineEventTypes.DIAGNOSTIC_LOG, {
      eventType: TimelineEventTypes.DIAGNOSTIC_LOG,
      category: TimelineCategory.OPERATIONAL,
      deduplicate: false,
      description: 'Repeatable diagnostic fault code entry'
    });
  }

  public static getEventConfig(eventType: string): EventRegistrationConfig | undefined {
    return TimelineEventRegistry.registry.get(eventType);
  }

  public static isRegistered(eventType: string): boolean {
    return TimelineEventRegistry.registry.has(eventType);
  }

  public static isDeduplicated(eventType: string): boolean {
    const config = TimelineEventRegistry.getEventConfig(eventType);
    return config ? config.deduplicate : false;
  }
}
