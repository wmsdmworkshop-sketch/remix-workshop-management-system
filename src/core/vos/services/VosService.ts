/**
 * DWIP Enterprise WOS - VosService (Unified Service Facade)
 * Task 1.2 Primary VOS Service Orchestrator
 */

import {
  drizzleVosRepository,
  drizzleVosStateHistoryRepository,
  drizzleVosOwnerHistoryRepository,
  drizzleVosTimelineRepository,
  drizzleVosConfigurationReferenceRepository,
  drizzleVosLinksRepository,
  drizzleVosAttributesRepository,
  drizzleVosTagsRepository
} from '../repositories';
import { vosValidationService, VosValidationService } from './VosValidationService';
import { VosQueryService } from './VosQueryService';
import { VosMutationService, UpdateVosRequest } from './VosMutationService';
import { VosLifecycleService, CreateVosRequest, CloseVosRequest } from './VosLifecycleService';
import { vosTransactionService, VosTransactionService } from './VosTransactionService';
import { vosEventPublisher, VosEventPublisher } from './VosEventPublisher';
import { IVos } from '../../../domain/vos/types';

export class VosService {
  public readonly query: VosQueryService;
  public readonly mutation: VosMutationService;
  public readonly lifecycle: VosLifecycleService;
  public readonly validation: VosValidationService;
  public readonly transaction: VosTransactionService;
  public readonly events: VosEventPublisher;

  constructor() {
    this.validation = vosValidationService;
    this.transaction = vosTransactionService;
    this.events = vosEventPublisher;

    this.query = new VosQueryService(
      drizzleVosRepository,
      drizzleVosLinksRepository,
      drizzleVosAttributesRepository,
      drizzleVosTagsRepository
    );

    this.mutation = new VosMutationService(
      drizzleVosRepository,
      this.validation
    );

    this.lifecycle = new VosLifecycleService(
      drizzleVosRepository,
      this.validation
    );
  }

  /**
   * Facade convenience method: Create VOS inside transaction boundary
   */
  public async createVos(request: CreateVosRequest, correlationId?: string): Promise<IVos> {
    return this.transaction.executeTransaction(
      'createVos',
      async () => {
        const vos = await this.lifecycle.createVos(request, correlationId);
        await this.events.publish('VOS_CREATED', vos.id, { vosNumber: vos.vosNumber });
        return vos;
      },
      correlationId
    );
  }

  /**
   * Facade convenience method: Update VOS mutable fields inside transaction boundary
   */
  public async updateVos(request: UpdateVosRequest, correlationId?: string): Promise<IVos> {
    return this.transaction.executeTransaction(
      'updateVos',
      async () => {
        const vos = await this.mutation.updateMutableFields(request, correlationId);
        await this.events.publish('VOS_UPDATED', vos.id, { version: vos.version });
        return vos;
      },
      correlationId
    );
  }

  /**
   * Facade convenience method: Close VOS inside transaction boundary
   */
  public async closeVos(request: CloseVosRequest, correlationId?: string): Promise<IVos> {
    return this.transaction.executeTransaction(
      'closeVos',
      async () => {
        const vos = await this.lifecycle.closeVos(request, correlationId);
        await this.events.publish('VOS_CLOSED', vos.id, { closedAt: vos.closedAt });
        return vos;
      },
      correlationId
    );
  }
}

export const vosService = new VosService();
