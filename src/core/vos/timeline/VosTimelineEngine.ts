/**
 * DWIP Enterprise WOS - VosTimelineEngine
 * Primary Append-Only Timeline Service Engine
 */

import { TimelineEvent, TimelineQuery } from './types';
import { IVosTimeline, TimelineCategory, SlaStatus } from '../../../domain/vos/types';
import { IVosTimelineRepository } from '../../../domain/vos/repositories';
import { drizzleVosTimelineRepository } from '../repositories/DrizzleVosTimelineRepository';
import { VosTimelineValidator, vosTimelineValidator } from './VosTimelineValidator';
import { VosTimelineRecorder, vosTimelineRecorder } from './VosTimelineRecorder';
import { VosTimelineEventMapper } from './VosTimelineEventMapper';
import { TransitionResult } from '../state/types';
import { StructuredLogger } from '../utils/StructuredLogger';

export class VosTimelineEngine {
  constructor(
    private timelineRepository: IVosTimelineRepository = drizzleVosTimelineRepository,
    private validator: VosTimelineValidator = vosTimelineValidator,
    private recorder: VosTimelineRecorder = vosTimelineRecorder
  ) {}

  /**
   * Append a new Timeline Event (Immutable Append-Only)
   */
  public async appendEvent(event: TimelineEvent, correlationId?: string): Promise<IVosTimeline> {
    const startTime = Date.now();

    // 1. Fetch existing timeline for deduplication check
    const existingTimeline = await this.timelineRepository.findByVosId(event.vosId);

    // 2. Validate Event & Deduplication Rules
    this.validator.validate(event, existingTimeline);

    // 3. Persist Event to Storage
    const record = await this.recorder.record(event);

    StructuredLogger.info(`Appended timeline event: ${event.eventType} for VOS ${event.vosId}`, {
      correlationId,
      vosId: event.vosId,
      component: 'VosTimelineEngine',
      operation: 'appendEvent',
      durationMs: Date.now() - startTime,
      result: 'SUCCESS',
      category: event.timelineCategory,
      eventType: event.eventType,
      source: event.source
    });

    return record;
  }

  /**
   * Query Timeline Events with Deterministic Chronological Ordering
   */
  public async queryEvents(query: TimelineQuery): Promise<IVosTimeline[]> {
    const records = await this.timelineRepository.findByVosId(query.vosId, query.category);

    let filtered = records;
    if (query.eventType) {
      filtered = filtered.filter(r => r.eventType === query.eventType);
    }

    // Sort deterministically by recordedAt timestamp ascending
    filtered.sort((a, b) => {
      const tA = new Date(a.recordedAt).getTime();
      const tB = new Date(b.recordedAt).getTime();
      if (tA === tB) {
        return a.id.localeCompare(b.id); // Tie-breaker for identical timestamps
      }
      return tA - tB;
    });

    if (query.limit && query.limit > 0) {
      const offset = query.offset || 0;
      filtered = filtered.slice(offset, offset + query.limit);
    }

    return filtered;
  }

  /**
   * Helper: Record Operational Milestone Event
   */
  public async recordOperationalEvent(
    vosId: string,
    eventType: string,
    title: string,
    description?: string,
    metadata?: Record<string, any>,
    correlationId?: string
  ): Promise<IVosTimeline> {
    return this.appendEvent(
      {
        vosId,
        timelineCategory: TimelineCategory.OPERATIONAL,
        eventType,
        title,
        description,
        source: 'USER_ACTION',
        structuredMetadata: metadata
      },
      correlationId
    );
  }

  /**
   * Helper: Record SLA Milestone Event
   */
  public async recordSlaEvent(
    vosId: string,
    slaStatus: SlaStatus,
    title: string,
    description?: string,
    metadata?: Record<string, any>,
    correlationId?: string
  ): Promise<IVosTimeline> {
    const event = VosTimelineEventMapper.createSlaEvent(vosId, slaStatus, title, description, metadata);
    return this.appendEvent(event, correlationId);
  }

  /**
   * Helper: Record OEM Milestone Event
   */
  public async recordOemEvent(
    vosId: string,
    eventType: string,
    title: string,
    description?: string,
    metadata?: Record<string, any>,
    correlationId?: string
  ): Promise<IVosTimeline> {
    const event = VosTimelineEventMapper.createOemEvent(vosId, eventType, title, description, metadata);
    return this.appendEvent(event, correlationId);
  }

  /**
   * Integration Handler: Record State Transition Event from State Engine
   */
  public async recordStateTransitionEvent(
    transitionResult: TransitionResult,
    correlationId?: string
  ): Promise<IVosTimeline> {
    const event = VosTimelineEventMapper.fromTransitionResult(transitionResult);
    return this.appendEvent(event, correlationId);
  }
}

export const vosTimelineEngine = new VosTimelineEngine();
