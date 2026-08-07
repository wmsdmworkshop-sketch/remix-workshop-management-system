/**
 * DWIP Enterprise WOS - VosTimelineEventMapper
 * Maps state transitions, SLA milestones & OEM events to TimelineEvent models
 */

import { TimelineEvent, TimelineEventTypes } from './types';
import { TimelineCategory, SlaStatus } from '../../../domain/vos/types';
import { TransitionResult } from '../state/types';

export class VosTimelineEventMapper {
  public static fromTransitionResult(result: TransitionResult): TimelineEvent {
    return {
      vosId: result.vosId,
      timelineCategory: TimelineCategory.OPERATIONAL,
      eventType: TimelineEventTypes.STATE_TRANSITION,
      title: `State Transition: ${result.previousState} -> ${result.currentState}`,
      description: `State code updated to ${result.stateCode} (v${result.version}). Time spent in previous state: ${result.timeSpentSeconds}s`,
      source: 'STATE_ENGINE',
      structuredMetadata: {
        previousState: result.previousState,
        currentState: result.currentState,
        stateCode: result.stateCode,
        version: result.version,
        timeSpentSeconds: result.timeSpentSeconds,
        historyId: result.historyRecord.id,
        ownershipHandoverTriggered: result.ownershipHandoverTriggered,
        newOwner: result.newOwner,
        newOwnerRole: result.newOwnerRole
      },
      recordedAt: result.timestamp
    };
  }

  public static createSlaEvent(
    vosId: string,
    slaStatus: SlaStatus,
    title: string,
    description?: string,
    metadata?: Record<string, any>
  ): TimelineEvent {
    const eventType =
      slaStatus === SlaStatus.WARNING
        ? TimelineEventTypes.SLA_WARNING_TRIGGERED
        : slaStatus === SlaStatus.BREACHED
        ? TimelineEventTypes.SLA_BREACH_TRIGGERED
        : TimelineEventTypes.SLA_RECOVERED;

    return {
      vosId,
      timelineCategory: TimelineCategory.INTERNAL_SLA,
      eventType,
      title,
      description: description || `Internal SLA status changed to ${slaStatus}`,
      source: 'SYSTEM',
      slaStatus,
      structuredMetadata: metadata || {}
    };
  }

  public static createOemEvent(
    vosId: string,
    eventType: string,
    title: string,
    description?: string,
    metadata?: Record<string, any>
  ): TimelineEvent {
    return {
      vosId,
      timelineCategory: TimelineCategory.OEM,
      eventType,
      title,
      description,
      source: 'OEM',
      structuredMetadata: metadata || {}
    };
  }
}
