/**
 * DWIP Enterprise WOS - VosTimelineValidator
 * Structural & Deduplication Validation for Timeline Events
 */

import { TimelineEvent } from './types';
import { IVosTimeline } from '../../../domain/vos/types';
import { VosTimelinePolicy, vosTimelinePolicy } from './VosTimelinePolicy';
import { VosTimelineException } from './VosTimelineException';

export class VosTimelineValidator {
  constructor(private policy: VosTimelinePolicy = vosTimelinePolicy) {}

  public validate(event: TimelineEvent, existingTimeline: IVosTimeline[] = []): void {
    if (!event.vosId) {
      throw new VosTimelineException('vosId is required for timeline event', 'VOS_TIMELINE_MISSING_VOS_ID');
    }

    if (!event.title || event.title.trim().length === 0) {
      throw new VosTimelineException('Event title is required for timeline event', 'VOS_TIMELINE_MISSING_TITLE');
    }

    // 1. Category validation
    this.policy.validateCategory(event.timelineCategory);

    // 2. Event type registration validation
    this.policy.validateEventType(event.eventType);

    // 3. Source validation
    this.policy.validateSource(event.source);

    // 4. Metadata JSON formatting validation
    if (event.structuredMetadata !== undefined) {
      try {
        JSON.stringify(event.structuredMetadata);
      } catch (err: any) {
        throw new VosTimelineException(
          `Invalid structuredMetadata payload: ${err.message}`,
          'VOS_TIMELINE_INVALID_METADATA'
        );
      }
    }

    // 5. Timestamp validation
    if (event.recordedAt) {
      const parsed = Date.parse(event.recordedAt);
      if (isNaN(parsed)) {
        throw new VosTimelineException(
          `Invalid timestamp format for recordedAt: ${event.recordedAt}`,
          'VOS_TIMELINE_INVALID_TIMESTAMP'
        );
      }
    }

    // 6. Deduplication validation
    this.policy.validateDeduplication(event, existingTimeline);
  }
}

export const vosTimelineValidator = new VosTimelineValidator();
