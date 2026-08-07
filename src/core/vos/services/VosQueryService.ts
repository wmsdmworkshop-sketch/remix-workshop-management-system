/**
 * DWIP Enterprise WOS - VosQueryService
 * Task 1.2 Read-Only VOS Retrieval Service
 */

import { IVosRepository, IVosLinksRepository, IVosAttributesRepository, IVosTagsRepository } from '../../../domain/vos/repositories';
import { IVos, IVosLink, IVosAttribute, IVosTag } from '../../../domain/vos/types';
import { VosNotFoundException } from '../exceptions';
import { StructuredLogger } from '../utils/StructuredLogger';

export class VosQueryService {
  constructor(
    private vosRepository: IVosRepository,
    private linksRepository: IVosLinksRepository,
    private attributesRepository: IVosAttributesRepository,
    private tagsRepository: IVosTagsRepository
  ) {}

  public async getById(id: string, correlationId?: string): Promise<IVos> {
    const startTime = Date.now();
    const vos = await this.vosRepository.findById(id);

    if (!vos) {
      StructuredLogger.warn(`VOS not found by ID: ${id}`, {
        correlationId,
        vosId: id,
        component: 'VosQueryService',
        operation: 'getById',
        durationMs: Date.now() - startTime,
        result: 'WARNING'
      });
      throw new VosNotFoundException(id);
    }

    StructuredLogger.info(`VOS retrieved by ID: ${id}`, {
      correlationId,
      vosId: vos.id,
      publicId: vos.publicId,
      companyId: vos.companyId,
      dealerId: vos.dealerId,
      branchId: vos.branchId,
      component: 'VosQueryService',
      operation: 'getById',
      durationMs: Date.now() - startTime,
      result: 'SUCCESS'
    });

    return vos;
  }

  public async getByPublicId(publicId: string, correlationId?: string): Promise<IVos> {
    const vos = await this.vosRepository.findByPublicId(publicId);
    if (!vos) {
      throw new VosNotFoundException(publicId);
    }
    return vos;
  }

  public async getByVosNumber(vosNumber: string, correlationId?: string): Promise<IVos> {
    const vos = await this.vosRepository.findByVosNumber(vosNumber);
    if (!vos) {
      throw new VosNotFoundException(vosNumber);
    }
    return vos;
  }

  public async getActiveByVehicleId(vehicleId: string): Promise<IVos | null> {
    return this.vosRepository.findActiveByVehicleId(vehicleId);
  }

  public async listByBranch(branchId: string): Promise<IVos[]> {
    return this.vosRepository.findAllByBranch(branchId);
  }

  public async listByCompany(companyId: string): Promise<IVos[]> {
    return this.vosRepository.findAllByCompany(companyId);
  }

  public async getDetailsWithMetadata(vosId: string): Promise<{
    vos: IVos;
    links: IVosLink[];
    attributes: IVosAttribute[];
    tags: IVosTag[];
  }> {
    const vos = await this.getById(vosId);
    const links = await this.linksRepository.findByVosId(vosId);
    const attributes = await this.attributesRepository.findByVosId(vosId);
    const tags = await this.tagsRepository.findByVosId(vosId);

    return { vos, links, attributes, tags };
  }
}
