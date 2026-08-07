/**
 * DWIP Enterprise WOS - DrizzleVosTagsRepository
 */

import { IVosTagsRepository } from '../../../domain/vos/repositories';
import { IVosTag } from '../../../domain/vos/types';
import { seedVosTag } from '../../../db/seed/vos_seed';

export class DrizzleVosTagsRepository implements IVosTagsRepository {
  private store: Map<string, IVosTag> = new Map();

  constructor() {
    this.store.set(seedVosTag.id, seedVosTag);
  }

  public async findByVosId(vosId: string): Promise<IVosTag[]> {
    const results: IVosTag[] = [];
    for (const tag of this.store.values()) {
      if (tag.vosId === vosId) {
        results.push({ ...tag });
      }
    }
    return results;
  }

  public async findByCategory(category: string): Promise<IVosTag[]> {
    const results: IVosTag[] = [];
    for (const tag of this.store.values()) {
      if (tag.tagCategory === category) {
        results.push({ ...tag });
      }
    }
    return results;
  }

  public async create(tag: Omit<IVosTag, 'id' | 'publicId' | 'createdAt'>): Promise<IVosTag> {
    const id = `tag_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const publicId = `PUB_${id.toUpperCase()}`;
    const record: IVosTag = {
      ...tag,
      id,
      publicId,
      createdAt: new Date().toISOString()
    };
    this.store.set(id, record);
    return { ...record };
  }

  public async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}

export const drizzleVosTagsRepository = new DrizzleVosTagsRepository();
