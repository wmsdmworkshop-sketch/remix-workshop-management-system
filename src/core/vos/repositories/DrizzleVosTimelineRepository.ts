/**
 * DWIP Enterprise WOS - DrizzleVosTimelineRepository
 */

import { IVosTimelineRepository } from '../../../domain/vos/repositories';
import { IVosTimeline } from '../../../domain/vos/types';
import { seedVosTimeline } from '../../../db/seed/vos_seed';

export class DrizzleVosTimelineRepository implements IVosTimelineRepository {
  private store: IVosTimeline[] = [seedVosTimeline];

  public async findByVosId(vosId: string, category?: string): Promise<IVosTimeline[]> {
    return this.store.filter(
      t => t.vosId === vosId && (!category || t.timelineCategory === category)
    );
  }

  public async create(timeline: Omit<IVosTimeline, 'id' | 'publicId' | 'recordedAt'>): Promise<IVosTimeline> {
    const id = `tl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const publicId = `PUB_${id.toUpperCase()}`;
    const record: IVosTimeline = {
      ...timeline,
      id,
      publicId,
      recordedAt: new Date().toISOString()
    };
    this.store.unshift(record);
    return { ...record };
  }
}

export const drizzleVosTimelineRepository = new DrizzleVosTimelineRepository();
