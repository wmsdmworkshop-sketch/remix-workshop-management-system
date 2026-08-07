/**
 * DWIP Enterprise WOS - DrizzleVosLinksRepository
 */

import { IVosLinksRepository } from '../../../domain/vos/repositories';
import { IVosLink } from '../../../domain/vos/types';
import { seedVosLink } from '../../../db/seed/vos_seed';

export class DrizzleVosLinksRepository implements IVosLinksRepository {
  private store: Map<string, IVosLink> = new Map();

  constructor() {
    this.store.set(seedVosLink.id, seedVosLink);
  }

  public async findByVosId(vosId: string, module?: string): Promise<IVosLink[]> {
    const results: IVosLink[] = [];
    for (const link of this.store.values()) {
      if (link.vosId === vosId && (!module || link.entityModule === module) && !link.isDeleted) {
        results.push({ ...link });
      }
    }
    return results;
  }

  public async findByEntity(entityModule: string, entityType: string, entityId: string): Promise<IVosLink[]> {
    const results: IVosLink[] = [];
    for (const link of this.store.values()) {
      if (
        link.entityModule === entityModule &&
        link.entityType === entityType &&
        link.entityId === entityId &&
        !link.isDeleted
      ) {
        results.push({ ...link });
      }
    }
    return results;
  }

  public async create(linkData: Omit<IVosLink, 'id' | 'publicId' | 'linkedAt'>): Promise<IVosLink> {
    const id = `lnk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const publicId = `PUB_${id.toUpperCase()}`;
    const record: IVosLink = {
      ...linkData,
      id,
      publicId,
      linkedAt: new Date().toISOString(),
      isDeleted: false
    };
    this.store.set(id, record);
    return { ...record };
  }

  public async softDelete(id: string): Promise<boolean> {
    const link = this.store.get(id);
    if (!link || link.isDeleted) return false;
    link.isDeleted = true;
    link.deletedAt = new Date().toISOString();
    this.store.set(id, link);
    return true;
  }
}

export const drizzleVosLinksRepository = new DrizzleVosLinksRepository();
