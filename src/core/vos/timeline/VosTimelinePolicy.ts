/**
 * DWIP Enterprise WOS - VosTimelinePolicy
 * Evaluates Timeline Category, Event Type Registration & Deduplication Policy Rules
 */

import { TimelineCategory, IVosTimeline } from '../../../domain/vos/types';
import { TimelineEvent, TimelineEventSource } from './types';
import { TimelineEventRegistry } from './TimelineEventRegistry';
import { VosTimelineException } from './VosTimelineException';

export class VosTimelinePolicy {
  public static readonly ALLOWED_SOURCES: TimelineEventSource[] = [
    'STATE_ENGINE',
    'USER_ACTION',
    'SYSTEM',
    'OEM',
    'API',
    'INTEGRATION'
  ];

  /**
   * Validate Event Category
   */
  public validateCategory(category: TimelineCategory): void {
    if (!Object.values(TimelineCategory).includes(category)) {
      throw new VosTimelineException(
        `Invalid timelineCategory '${category}'. Must be one of OPERATIONAL, INTERNAL_SLA, or OEM`,
        'VOS_TIMELINE_INVALID_CATEGORY'
      );
    }
  }

  /**
   * Validate Event Type Registration
   */
  public validateEventType(eventType: string): void {
    if (!TimelineEventRegistry.isRegistered(eventType)) {
      throw new VosTimelineException(
        `Unknown timeline eventType '${eventType}'. Event type must be registered in TimelineEventRegistry`,
        'VOS_TIMELINE_UNKNOWN_EVENT_TYPE'
      );
    }
  }

  /**
   * Validate Event Source
   */
  public validateSource(source: TimelineEventSource): void {
    if (!VosTimelinePolicy.ALLOWED_SOURCES.includes(source)) {
      throw new VosTimelineException(
        `Invalid timeline event source '${source}'. Allowed sources: ${VosTimelinePolicy.ALLOWED_SOURCES.join(', ')}`,
        'VOS_TIMELINE_INVALID_SOURCE'
      );
    }
  }

  /**
   * Check Deduplication Constraint against Existing Timeline Records
   */
  public validateDeduplication(event: TimelineEvent, existingTimeline: IVosTimeline[]): void {
    if (!TimelineEventRegistry.isDeduplicated(event.eventType)) {
      return; // Deduplication not required for this event type
    }

    const duplicate = existingTimeline.find(t => t.eventType === event.eventType);
    if (duplicate) {
      throw new VosTimelineException(
        `Duplicate timeline event rejected for VOS ${event.vosId}: Event type '${event.eventType}' is restricted to single occurrence per session.`,
        'VOS_TIMELINE_DUPLICATE_EVENT',
        { vosId: event.vosId, eventType: event.eventType, existingEventId: duplicate.id }
      );
    }
  }
}

export const vosTimelinePolicy = new VosTimelinePolicy();
