/**
 * DWIP Enterprise WOS - VosTimelineRecorder
 * Appends Timeline Events to Persistent Storage
 */

import { IVosTimelineRepository } from '../../../domain/vos/repositories';
import { IVosTimeline } from '../../../domain/vos/types';
import { TimelineEvent } from './types';
import { drizzleVosTimelineRepository } from '../repositories/DrizzleVosTimelineRepository';

export class VosTimelineRecorder {
  constructor(private timelineRepository: IVosTimelineRepository = drizzleVosTimelineRepository) {}

  public async record(event: TimelineEvent): Promise<IVosTimeline> {
    const metadataJson = event.structuredMetadata
      ? JSON.stringify({ source: event.source, ...event.structuredMetadata })
      : JSON.stringify({ source: event.source });

    const created = await this.timelineRepository.create({
      vosId: event.vosId,
      timelineCategory: event.timelineCategory,
      eventType: event.eventType,
      title: event.title,
      description: event.description,
      structuredMetadataJson: metadataJson,
      slaStatus: event.slaStatus
    });

    return created;
  }
}

export const vosTimelineRecorder = new VosTimelineRecorder();
